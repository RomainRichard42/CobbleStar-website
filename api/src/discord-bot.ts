import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client,
  Events, GatewayIntentBits, MessageFlags, ModalBuilder, Partials, PermissionFlagsBits as P, Routes,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
  type ChatInputCommandInteraction, type Guild, type GuildMember, type Interaction,
  type Message, type PartialMessage, type TextChannel, type ModalSubmitInteraction,
  type MessageReaction, type PartialMessageReaction, type User, type PartialUser, type MessageCreateOptions, type ClientOptions,
} from "discord.js";
import type { FastifyBaseLogger } from "fastify";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { config } from "./config.js";
import { pool, transaction } from "./db.js";
import { eventKinds, stages, plain, summary, inviteAttribution, mayConfirm, type EventKind, type Settings } from "./discord-policy.js";
import { enqueue, json, saveSettings, settings, ticketFor, type Ticket } from "./discord-store.js";

const ephemeral = {flags: MessageFlags.Ephemeral} as const;
const noMentions = {parse: [] as never[]};
const button = (id: string, label: string, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const row = (...buttons: ButtonBuilder[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
const textField = (id: string, label: string, max: number, paragraph = false) =>
  new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label)
    .setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true).setMaxLength(max));
const userError = (message: string): never => { throw new Error(`USER:${message}`); };

export function discordCommands() {
  const setup = new SlashCommandBuilder().setName("csconfig").setDescription("Configurer CobbleStar (administrateurs)")
    .setDefaultMemberPermissions(P.Administrator)
    .addSubcommand(s => s.setName("role").setDescription("Définir un rôle autorisé")
      .addStringOption(o => o.setName("usage").setDescription("Accès").setRequired(true).addChoices({name:"Staff tickets",value:"staff"},{name:"Administrateurs MP/chat",value:"admin"}))
      .addRoleOption(o => o.setName("role").setDescription("Rôle privé, jamais @everyone").setRequired(true)))
    .addSubcommand(s => s.setName("salon").setDescription("Destination des journaux")
      .addStringOption(o => o.setName("usage").setDescription("Journal").setRequired(true).addChoices(...eventKinds.map(v=>({name:v,value:v}))))
      .addChannelOption(o => o.setName("salon").setDescription("Salon texte").setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName("categorie").setDescription("Catégorie d’une étape ticket")
      .addStringOption(o => o.setName("etape").setDescription("Étape").setRequired(true).addChoices(...stages.map(v=>({name:v,value:v}))))
      .addChannelOption(o => o.setName("categorie").setDescription("Catégorie").setRequired(true).addChannelTypes(ChannelType.GuildCategory)))
    .addSubcommand(s => s.setName("surveiller").setDescription("Activer les logs dans un salon précis")
      .addChannelOption(o => o.setName("salon").setDescription("Salon source").setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addBooleanOption(o => o.setName("actif").setDescription("Collecte active").setRequired(true)))
    .addSubcommand(s => s.setName("mp").setDescription("Activer les MP Minecraft après information des joueurs")
      .addBooleanOption(o => o.setName("actif").setDescription("Accès admin privé obligatoire").setRequired(true)))
    .addSubcommand(s => s.setName("retention").setDescription("Durée des journaux et transcripts (1 à 90 jours)")
      .addIntegerOption(o => o.setName("jours").setDescription("Jours").setRequired(true).setMinValue(1).setMaxValue(90)))
    .addSubcommand(s => s.setName("panneau").setDescription("Publier le bouton de création de tickets ici"))
    .addSubcommand(s => s.setName("initialiser").setDescription("Créer les salons et catégories manquants après configuration des rôles"))
    .addSubcommand(s => s.setName("statut").setDescription("Voir la configuration sans secrets"));
  const ticket = new SlashCommandBuilder().setName("ticket").setDescription("Assistance CobbleStar")
    .addSubcommand(s=>s.setName("creer").setDescription("Ouvrir un ticket avec un formulaire"))
    .addSubcommand(s=>s.setName("claim").setDescription("Prendre en charge ce ticket (staff)"))
    .addSubcommand(s=>s.setName("deplacer").setDescription("Changer l’étape (staff)")
      .addStringOption(o=>o.setName("etape").setDescription("Destination").setRequired(true).addChoices(...stages.map(v=>({name:v,value:v})))))
    .addSubcommand(s=>s.setName("ajouter").setDescription("Ajouter un joueur au ticket (staff)")
      .addUserOption(o=>o.setName("joueur").setDescription("Joueur").setRequired(true)))
    .addSubcommand(s=>s.setName("fermer").setDescription("Demander confirmation au propriétaire")
      .addStringOption(o=>o.setName("resume").setDescription("Conclusion / résolution").setRequired(true).setMaxLength(1000)))
    .addSubcommand(s=>s.setName("forcer-fermeture").setDescription("Archiver et fermer sans confirmation (staff)")
      .addStringOption(o=>o.setName("resume").setDescription("Conclusion et motif de fermeture").setRequired(true).setMaxLength(1000)));
  return [setup.toJSON(), ticket.toJSON()];
}

export async function startDiscordBot(log: FastifyBaseLogger, clientFactory: (options: ClientOptions) => Client = options => new Client(options)): Promise<() => Promise<void>> {
  if (!config.DISCORD_BOT_TOKEN) throw new Error("Bot token absent");
  // Dedicated session lock prevents two API replicas handling the same Gateway events.
  const lock = await pool.getConnection();
  const lockName = `cs-discord-${config.DISCORD_GUILD_ID}`;
  const [locks] = await lock.query<RowDataPacket[]>("SELECT GET_LOCK(?,0) AS acquired", [lockName]);
  if (Number(locks[0]?.acquired) !== 1) { lock.release(); throw new Error("Bot déjà actif"); }
  const client = clientFactory({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildInvites],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
    allowedMentions: noMentions,
  });
  let stopped = false, timer: ReturnType<typeof setInterval> | undefined, busy = false;
  const safe = (work: () => Promise<unknown>) => { void work().catch(() => log.warn("Opération Discord échouée ; aucun contenu de message ni secret n’est écrit dans les logs API.")); };
  async function stop() {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    client.destroy();
    try { await lock.query("SELECT RELEASE_LOCK(?)", [lockName]); } finally { lock.release(); }
  }
  lock.on("error", () => { safe(stop); });
  client.on(Events.Error, () => log.warn("Erreur de connexion Discord."));

  async function guild() { return client.guilds.fetch(config.DISCORD_GUILD_ID); }
  async function member(g: Guild, id: string) { return g.members.fetch(id); }
  function isAdmin(m: GuildMember) { return m.permissions.has(P.Administrator); }
  function isStaff(m: GuildMember, s: Settings) { return isAdmin(m) || !!s.staffRole && m.roles.cache.has(s.staffRole); }
  async function textChannel(id: string) {
    const c = await client.channels.fetch(id);
    if (!c || c.type !== ChannelType.GuildText || c.guildId !== config.DISCORD_GUILD_ID) return userError("Salon texte introuvable dans ce serveur.");
    return c;
  }
  async function sendLog(c: TextChannel, payload: MessageCreateOptions) {
    const message=await c.send(payload);
    await pool.execute("INSERT INTO discord_log_posts (message_id,channel_id,guild_id) VALUES (?,?,?)",[message.id,c.id,c.guildId]);
    return message;
  }
  async function destination(s: Settings, kind: EventKind) {
    const id = s.channels[kind];
    if (!id) return userError(`Salon ${kind} non configuré.`);
    const c = await textChannel(id);
    if (["private", "chat", "moderation", "tickets", "members"].includes(kind)) {
      const allowed = kind === "private" || kind === "chat" ? s.adminRole : s.staffRole;
      if (!allowed) return userError("Rôle autorisé non configuré.");
      // Fail closed: no broad role/member overwrite may grant access to sensitive logs.
      const roles = await c.guild.roles.fetch();
      for (const role of roles.values()) {
        if (!role || role.id === allowed || role.permissions.has(P.Administrator) || role.tags?.botId === client.user!.id) continue;
        if (c.permissionsFor(role).has(P.ViewChannel)) return userError("Ce journal est visible par un rôle non autorisé. Corrige ses permissions.");
      }
      for (const overwrite of c.permissionOverwrites.cache.values()) {
        if (overwrite.type !== 1 || !overwrite.allow.has(P.ViewChannel) || overwrite.id === client.user!.id) continue;
        const m = await member(c.guild, overwrite.id);
        if (!isAdmin(m) && !m.roles.cache.has(allowed)) return userError("Un membre non autorisé peut lire ce journal.");
      }
    }
    const me = await c.guild.members.fetchMe();
    if (!c.permissionsFor(me).has([P.ViewChannel,P.SendMessages,P.AttachFiles])) return userError("Le bot doit pouvoir lire, envoyer et joindre des fichiers dans ce salon.");
    return c;
  }
  async function privateOverwrites(g: Guild, s: Settings, owner: string, members: string[] = [], closed = false) {
    if (!s.staffRole || !g.roles.cache.has(s.staffRole)) return userError("Configure d’abord le rôle staff.");
    return [
      {id:g.id,deny:[P.ViewChannel]},
      {id:client.user!.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.ManageChannels,P.ManageMessages,P.AttachFiles]},
      {id:s.staffRole,allow:[P.ViewChannel,P.ReadMessageHistory,...(closed?[]:[P.SendMessages,P.AttachFiles])],deny:closed?[P.SendMessages]:[]},
      ...[...new Set([owner,...members])].map(id=>({id,allow:[P.ViewChannel,P.ReadMessageHistory,...(closed?[]:[P.SendMessages,P.AttachFiles])],deny:closed?[P.SendMessages]:[]})),
    ];
  }
  async function move(t: Ticket, stage: typeof stages[number], s: Settings) {
    const target = s.categories[stage];
    if (!target) return userError("Catégorie non configurée pour cette étape.");
    const g = await guild(), category = await g.channels.fetch(target);
    if (category?.type !== ChannelType.GuildCategory) return userError("Catégorie invalide.");
    const c = await textChannel(t.channel_id);
    await c.setParent(target,{lockPermissions:false});
    await c.permissionOverwrites.set(await privateOverwrites(g,s,t.owner_id,json<string[]>(t.members)));
    await pool.execute("UPDATE discord_tickets SET status=? WHERE id=? AND status NOT IN ('closed','closing')",[stage,t.id]);
  }
  async function createTicket(i: ModalSubmitInteraction, s: Settings) {
    const id = randomUUID(), g = await guild();
    if (!s.categories.reception) return userError("Catégorie réception non configurée.");
    await destination(s,"tickets");
    const subject = plain(i.fields.getTextInputValue("subject"),120), description = plain(i.fields.getTextInputValue("description"),3000);
    // Serialize duplicate clicks/requests per owner through a SQL advisory lock.
    const conn = await pool.getConnection();
    const name = `cs-ticket-${i.user.id}`;
    let c: TextChannel | undefined;
    try {
      const [acq] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK(?,2) AS ok",[name]);
      if (Number(acq[0]?.ok)!==1) return userError("Création déjà en cours.");
      const [open] = await conn.query<RowDataPacket[]>("SELECT id FROM discord_tickets WHERE guild_id=? AND owner_id=? AND status<>'closed' LIMIT 1",[g.id,i.user.id]);
      if (open.length) return userError("Tu as déjà un ticket ouvert. Contacte le staff si tu ne retrouves plus son salon.");
      c = await g.channels.create({name:`ticket-${id.slice(0,8)}`,type:ChannelType.GuildText,parent:s.categories.reception,
        topic:`CobbleStar · ${id}`,permissionOverwrites:await privateOverwrites(g,s,i.user.id)});
      await conn.execute("INSERT INTO discord_tickets (id,guild_id,owner_id,channel_id,subject,description,members) VALUES (?,?,?,?,?,?,?)",
        [id,g.id,i.user.id,c.id,subject,description,"[]"]);
      const intro=`**${subject}**\nDemandeur : <@${i.user.id}>\n${description}`;
      await c.send({content:plain(intro,1900),...(intro.length>1900?{files:[new AttachmentBuilder(Buffer.from(intro,"utf8"),{name:"demande.txt"})]}:{}),allowedMentions:noMentions});
      await c.send({content:`Le staff peut utiliser /ticket claim, deplacer, ajouter et fermer. Les échanges sont archivés pour le support (${s.retentionDays} jours après fermeture).`,allowedMentions:noMentions});
      await i.editReply({content:`Ton ticket : <#${c.id}>`});
    } catch (error) {
      if(c) log.warn({channelId:c.id},"Création ticket interrompue : vérifier le salon, ne pas supprimer les échanges.");
      throw error;
    } finally { await conn.query("SELECT RELEASE_LOCK(?)",[name]); conn.release(); }
  }
  async function closeTicket(t: Ticket, reason: string, actor: string, s: Settings) {
    const archive = await destination(s,"tickets");
    const [changed] = await pool.execute<ResultSetHeader>("UPDATE discord_tickets SET status='closing',close_reason=? WHERE id=? AND status NOT IN ('closed','closing')",[reason,t.id]);
    if (!changed.affectedRows) return userError("Fermeture déjà en cours ou ticket fermé.");
    try {
      const c = await textChannel(t.channel_id);
      await c.permissionOverwrites.set(await privateOverwrites(c.guild,s,t.owner_id,json<string[]>(t.members),true));
      // Pages are separate attachments to avoid Discord upload limits; no silent truncation.
      const chunks: {at:number;text:string}[] = [];
      let before: string | undefined;
      for (;;) {
        const page = await c.messages.fetch({limit:100,...(before?{before}:{})});
        if (!page.size) break;
        for(const m of page.values()) chunks.push({at:m.createdTimestamp,text:`${m.createdAt.toISOString()} | ${m.author.tag} (${m.author.id}) | ${m.content}\n${[...m.attachments.values()].map(a=>`Pièce jointe : ${a.name} ${a.url}`).join("\n")}`});
        before=page.last()!.id;
        if(page.size<100) break;
        if(chunks.length>100_000) throw new Error("Transcript trop grand : fermeture arrêtée pour préserver les messages");
      }
      chunks.sort((a,b)=>a.at-b.at);
      const lines = [summary({...t,close_reason:reason}),`Fermé par ${actor} · Ticket ${t.id}`,"",...chunks.map(c=>c.text)];
      let part=1, buffer="";
      const flush=async()=> { if(!buffer) return; await sendLog(archive,{content:`Transcript ${t.id} · partie ${part}`,files:[new AttachmentBuilder(Buffer.from(buffer,"utf8"),{name:`ticket-${t.id}-${part++}.txt`})],allowedMentions:noMentions}); buffer=""; };
      for(const line of lines) { if(Buffer.byteLength(buffer+line,"utf8")>1_000_000) await flush(); buffer+=line+"\n"; }
      await flush();
      const report=await sendLog(archive,{content:plain(`**Ticket fermé — ${t.id}**\n${summary({...t,close_reason:reason})}`,1950),allowedMentions:noMentions});
      await pool.execute("UPDATE discord_tickets SET status='closed',closed_at=NOW(),close_token=NULL,archive_message=? WHERE id=?",[report.id,t.id]);
      await c.send({content:"Ticket fermé et archivé. Ce salon reste en lecture seule pour les participants jusqu’à expiration de la durée de conservation.",allowedMentions:noMentions});
    } catch(error) {
      const [restored]=await pool.execute<ResultSetHeader>("UPDATE discord_tickets SET status=? WHERE id=? AND status='closing'",[t.status,t.id]);
      if(restored.affectedRows) {
        try {const c=await textChannel(t.channel_id);await c.permissionOverwrites.set(await privateOverwrites(c.guild,s,t.owner_id,json<string[]>(t.members)));}
        catch {log.warn({ticketId:t.id},"Rétablissement des accès ticket à vérifier manuellement.");}
      }
      throw error;
    }
  }
  async function configure(i: ChatInputCommandInteraction, s: Settings) {
    const g=await guild(), m=await member(g,i.user.id);
    if(!isAdmin(m)) return userError("Réservé aux administrateurs Discord.");
    const sub=i.options.getSubcommand();
    if(sub==="initialiser") {
      if(!s.staffRole||!s.adminRole) return userError("Définis les rôles avec /csconfig role (staff et admin) avant l’initialisation.");
      const overwrites=(role:string)=>[
        {id:g.id,deny:[P.ViewChannel]},
        {id:role,allow:[P.ViewChannel,P.ReadMessageHistory,P.SendMessages]},
        {id:client.user!.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles,P.ManageChannels,P.ManageRoles]},
      ];
      const categoryNames={reception:"Tickets • Réception",en_cours:"Tickets • En cours",bug:"Tickets • Bug",a_fermer:"Tickets • À fermer"};
      for(const stage of stages) {
        if(s.categories[stage]) continue;
        const c=await g.channels.create({name:categoryNames[stage],type:ChannelType.GuildCategory,permissionOverwrites:overwrites(s.staffRole)});
        s.categories[stage]=c.id;await saveSettings(s);
      }
      const names={tickets:"archives-tickets",moderation:"logs-discord",members:"arrivees-membres",chat:"chat-minecraft-admin",private:"mp-minecraft-admin",gts:"gts",minigame:"mini-jeux"};
      for(const kind of eventKinds) {
        if(s.channels[kind]) continue;
        const permissions=kind==="gts"||kind==="minigame"?[
          {id:g.id,allow:[P.ViewChannel,P.ReadMessageHistory],deny:[P.SendMessages]},
          {id:client.user!.id,allow:[P.ViewChannel,P.SendMessages,P.AttachFiles,P.ReadMessageHistory]},
        ]:overwrites(kind==="private"||kind==="chat"?s.adminRole:s.staffRole);
        const c=await g.channels.create({name:names[kind],type:ChannelType.GuildText,permissionOverwrites:permissions});
        s.channels[kind]=c.id;await saveSettings(s);await destination(s,kind);
      }
    } else if(sub==="role") {
      const role=i.options.getRole("role",true);
      if(role.id===g.id || role.managed) return userError("Choisis un rôle privé non géré par une intégration.");
      s[i.options.getString("usage",true)==="staff"?"staffRole":"adminRole"]=role.id;
    } else if(sub==="salon") {
      const kind=i.options.getString("usage",true) as EventKind;
      s.channels[kind]=i.options.getChannel("salon",true).id;
      await destination(s,kind);
    } else if(sub==="categorie") {
      s.categories[i.options.getString("etape",true) as typeof stages[number]]=i.options.getChannel("categorie",true).id;
    } else if(sub==="surveiller") {
      const id=i.options.getChannel("salon",true).id;
      if(Object.values(s.channels).includes(id)) return userError("Ne surveille pas un salon de sortie du bot (boucle de logs).");
      s.watched=s.watched.filter(c=>c!==id);
      if(i.options.getBoolean("actif",true)) s.watched.push(id);
    } else if(sub==="mp") {
      s.privateEnabled=i.options.getBoolean("actif",true);
      if(s.privateEnabled) await destination(s,"private");
    } else if(sub==="retention") s.retentionDays=i.options.getInteger("jours",true);
    else if(sub==="panneau") {
      if(!s.staffRole||!s.categories.reception) return userError("Configure staff et réception d’abord.");
      const c=await textChannel(i.channelId);
      await c.send({content:"**Assistance CobbleStar**\nDécris ta demande dans le formulaire. Le ticket est privé entre toi, les personnes ajoutées et le staff. Les échanges sont archivés pour traiter ta demande.",components:[row(button("cs:ticket:create","Créer un ticket",ButtonStyle.Primary))]});
    } else if(sub==="statut") {
      await i.editReply({content:`Configuration :\n\`\`\`json\n${JSON.stringify(s,null,2)}\n\`\`\``}); return;
    }
    await saveSettings(s);
    await i.editReply({content:"Configuration enregistrée."});
  }
  async function ticketCommand(i: ChatInputCommandInteraction,s: Settings) {
    const t=await ticketFor(i.channelId);
    if(!t||t.status==="closed"||t.status==="closing") return userError("Utilise cette commande dans un ticket ouvert.");
    const g=await guild(), m=await member(g,i.user.id), staff=isStaff(m,s), sub=i.options.getSubcommand();
    if(!staff && !(sub==="fermer"&&t.owner_id===i.user.id)) return userError("Action réservée au staff.");
    if(sub==="claim") {
      const [r]=await pool.execute<ResultSetHeader>("UPDATE discord_tickets SET claimed_by=? WHERE id=? AND (claimed_by IS NULL OR claimed_by=?)",[i.user.id,t.id,i.user.id]);
      if(!r.affectedRows) return userError("Ce ticket est déjà pris en charge.");
      if(s.categories.en_cours) await move(t,"en_cours",s);
      await (await textChannel(t.channel_id)).send({content:`Ticket pris en charge par <@${i.user.id}>.`,allowedMentions:noMentions});
    } else if(sub==="deplacer") await move(t,i.options.getString("etape",true) as typeof stages[number],s);
    else if(sub==="ajouter") {
      const id=i.options.getUser("joueur",true).id;
      const added=await member(g,id);
      if(added.user.bot) return userError("Ajoute un joueur, pas un bot.");
      await transaction(async conn=> {
        const [rows]=await conn.query<Ticket[]>("SELECT * FROM discord_tickets WHERE id=? FOR UPDATE",[t.id]);
        const members=[...new Set([...json<string[]>(rows[0]!.members),id])];
        await (await textChannel(t.channel_id)).permissionOverwrites.set(await privateOverwrites(g,s,t.owner_id,members));
        await conn.execute("UPDATE discord_tickets SET members=? WHERE id=?",[JSON.stringify(members),t.id]);
      });
    } else if(sub==="forcer-fermeture") await closeTicket(t,i.options.getString("resume",true),i.user.id,s);
    else if(sub==="fermer") {
      const token=randomUUID(), reason=i.options.getString("resume",true);
      await pool.execute("UPDATE discord_tickets SET close_token=?,close_expires=DATE_ADD(NOW(),INTERVAL 24 HOUR),close_reason=? WHERE id=?",[token,reason,t.id]);
      if(s.categories.a_fermer) await move(t,"a_fermer",s);
      await (await textChannel(t.channel_id)).send({content:`<@${t.owner_id}>, confirmes-tu la fermeture ?\n${plain(reason,1000)}\nConfirmation valable 24 heures.`,allowedMentions:{users:[t.owner_id]},
        components:[row(button(`cs:close:${token}`,"Confirmer la fermeture",ButtonStyle.Danger),button(`cs:keep:${token}`,"Garder ouvert"))]});
    }
    await i.editReply({content:"Action effectuée."});
  }
  const interacting = new Set<string>();
  client.on(Events.InteractionCreate,i=>safe(async()=> {
    if(stopped||i.guildId!==config.DISCORD_GUILD_ID) return;
    const ours=i.isChatInputCommand()?["ticket","csconfig"].includes(i.commandName):(i.isButton()||i.isModalSubmit())&&i.customId.startsWith("cs:");
    if(!ours) return;
    const resource=i.isChatInputCommand()&&i.commandName==="csconfig"?"configuration":i.channelId??i.user.id;
    if(interacting.has(resource)) {if(i.isRepliable()) await i.reply({content:"Une action est déjà en cours ici. Réessaie dans un instant.",...ephemeral});return;}
    interacting.add(resource);
    try {
      if((i.isButton()&&i.customId==="cs:ticket:create")||(i.isChatInputCommand()&&i.commandName==="ticket"&&i.options.getSubcommand()==="creer")) {
        await i.showModal(new ModalBuilder().setCustomId("cs:ticket:form").setTitle("Assistance CobbleStar")
          .addComponents(textField("subject","Sujet",120),textField("description","Ta demande / étapes du bug",3000,true))); return;
      }
      if(!i.isChatInputCommand()&&!i.isModalSubmit()&&!i.isButton()) return;
      await i.deferReply(ephemeral);
      const s=await settings();
      if(i.isModalSubmit()&&i.customId==="cs:ticket:form") await createTicket(i,s);
      else if(i.isChatInputCommand()) {
        if(i.commandName==="csconfig") await configure(i,s); else await ticketCommand(i,s);
      } else if(i.isButton()&&(i.customId.startsWith("cs:close:")||i.customId.startsWith("cs:keep:"))) {
        const t=await ticketFor(i.channelId);
        if(!t||t.close_token!==i.customId.split(":")[2]||!mayConfirm(t.owner_id,i.user.id,t.close_expires)) return userError("Seul le demandeur peut confirmer une demande de fermeture encore valide.");
        if(i.customId.startsWith("cs:close:")) await closeTicket(t,t.close_reason??"Confirmation du demandeur",i.user.id,s);
        else {
          await pool.execute("UPDATE discord_tickets SET close_token=NULL,close_expires=NULL WHERE id=?",[t.id]);
          if(s.categories.en_cours) await move(t,"en_cours",s);
        }
        await i.message.edit({components:[]});
        await i.editReply({content:"Choix enregistré."});
      }
    } catch(error) {
      const message=error instanceof Error&&error.message.startsWith("USER:")?error.message.slice(5):"Action non terminée. Vérifie les permissions/configurations ; le ticket n’a pas été supprimé.";
      if(i.isRepliable()) { if(i.deferred||i.replied) await i.editReply({content:message}); else await i.reply({content:message,...ephemeral}); }
      if(!(error instanceof Error&&error.message.startsWith("USER:"))) log.warn("Action Discord échouée (détails sensibles masqués).");
    } finally {interacting.delete(resource);}
  }));

  async function watched(m: Message | PartialMessage,s: Settings) {
    return m.guildId===config.DISCORD_GUILD_ID && s.watched.includes(m.channelId) && !Object.values(s.channels).includes(m.channelId);
  }
  function messageContent(m: Message | PartialMessage) {
    return plain(m.content,6000)+"\n"+[...m.attachments.values()].map(a=>`[${a.name}] ${a.url}`).join("\n");
  }
  async function cache(m: Message | PartialMessage,s: Settings) {
    if(!await watched(m,s)||m.partial||m.author.bot) return;
    const content=messageContent(m);
    await pool.execute("INSERT INTO discord_message_cache (message_id,guild_id,channel_id,author_id,content) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),updated_at=NOW()",[m.id,m.guildId,m.channelId,m.author.id,content]);
  }
  client.on(Events.MessageCreate,m=>safe(async()=>cache(m,await settings())));
  client.on(Events.MessageUpdate,(old,m)=>safe(async()=> {
    const s=await settings(); if(!await watched(m,s)) return;
    if(m.partial) { try { m=await m.fetch(); } catch { return; } }
    if(m.author?.bot) return;
    const [previous]=await pool.query<RowDataPacket[]>("SELECT content,author_id FROM discord_message_cache WHERE message_id=?",[m.id]);
    const before=previous[0]?.content??(old.partial?"Contenu précédent non disponible (non observé par le bot).":messageContent(old));
    const after=messageContent(m);
    if(before!==after) await enqueue("moderation",`Message modifié · ${m.channelId}/${m.id} · auteur ${m.author?.id??previous[0]?.author_id??"inconnu"}\nAVANT : ${plain(before,12000)}\nAPRÈS : ${plain(after,12000)}`);
    await cache(m,s);
  }));
  async function deleted(m: Message | PartialMessage) {
    const s=await settings(); if(!await watched(m,s)) return;
    const [previous]=await pool.query<RowDataPacket[]>("SELECT content,author_id FROM discord_message_cache WHERE message_id=?",[m.id]);
    if(m.author?.bot) return;
    await enqueue("moderation",`Message supprimé · ${m.channelId}/${m.id}\nAuteur : ${previous[0]?.author_id??m.author?.id??"inconnu"}\n${plain(previous[0]?.content??m.content??"Contenu non disponible : message non observé avant suppression.",12000)}\nLa personne ayant supprimé ce message n’est pas déterminée.`);
    await pool.execute("DELETE FROM discord_message_cache WHERE message_id=?",[m.id]);
  }
  client.on(Events.MessageDelete,m=>safe(()=>deleted(m)));
  client.on(Events.MessageBulkDelete,ms=>safe(async()=> { for(const m of ms.values()) await deleted(m); }));
  const reactionLog=(verb:string,reaction:MessageReaction|PartialMessageReaction,user:User|PartialUser)=>safe(async()=> {
      const s=await settings(); if(!await watched(reaction.message,s)||user.bot) return;
      await enqueue("moderation",`Réaction ${verb} : ${reaction.emoji.toString()} · utilisateur ${user.id} · message ${reaction.message.channelId}/${reaction.message.id}`);
    });
  client.on(Events.MessageReactionAdd,(r,u)=>reactionLog("ajoutée",r,u));
  client.on(Events.MessageReactionRemove,(r,u)=>reactionLog("retirée",r,u));
  client.on(Events.MessageReactionRemoveAll,m=>safe(async()=> { const s=await settings(); if(await watched(m,s)) await enqueue("moderation",`Toutes les réactions retirées · ${m.channelId}/${m.id}`); }));
  client.on(Events.MessageReactionRemoveEmoji,r=>safe(async()=> {const s=await settings();if(await watched(r.message,s)) await enqueue("moderation",`Réaction ${r.emoji.toString()} entièrement retirée · ${r.message.channelId}/${r.message.id}`);}));
  let invitesQueue=Promise.resolve();
  async function snapshotInvites(g: Guild,joined?: string) {
    const [old]=await pool.query<RowDataPacket[]>("SELECT code,uses FROM discord_invites WHERE guild_id=?",[g.id]);
    let invites;
    try { invites=await g.invites.fetch(); }
    catch { if(joined) await enqueue("members",`Nouveau membre ${joined} · invitation indéterminée (permission Gérer le serveur absente ou invitation indisponible).`); return; }
    const current=[...invites.values()].map(v=>({code:v.code,uses:v.uses??0,inviter:v.inviter?.id??null}));
    const attribution=inviteAttribution(new Map(old.map(v=>[String(v.code),Number(v.uses)])),current);
    if(joined) await enqueue("members",`Nouveau membre ${joined}\n${attribution?`Invitation probablement utilisée : ${attribution.code} · invitant ${attribution.inviter??"inconnu"} (déduction par compteur)` :"Invitant indéterminé : arrivées simultanées, lien expiré/unique, OAuth ou URL personnalisée possibles."}`);
    await transaction(async conn=> {
      await conn.execute("DELETE FROM discord_invites WHERE guild_id=?",[g.id]);
      for(const v of current) await conn.execute("INSERT INTO discord_invites (guild_id,code,uses,inviter_id) VALUES (?,?,?,?)",[g.id,v.code,v.uses,v.inviter]);
    });
  }
  client.on(Events.GuildMemberAdd,m=> { if(m.guild.id!==config.DISCORD_GUILD_ID)return; invitesQueue=invitesQueue.then(()=>snapshotInvites(m.guild,m.user.id)).catch(()=>log.warn("Attribution invitation indisponible.")); });
  client.on(Events.InviteCreate,i=>safe(async()=> { if(i.guild?.id===config.DISCORD_GUILD_ID) await pool.execute("INSERT INTO discord_invites (guild_id,code,uses,inviter_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE uses=VALUES(uses)",[i.guild.id,i.code,i.uses??0,i.inviter?.id??null]); }));

  let cleanupAt=0;
  async function cleanup(s: Settings) {
    if(Date.now()<cleanupAt) return;
    cleanupAt=Date.now()+3600_000;
    await pool.execute("DELETE FROM discord_message_cache WHERE updated_at < DATE_SUB(NOW(),INTERVAL ? DAY)",[s.retentionDays]);
    await pool.execute("DELETE FROM discord_event_outbox WHERE created_at < DATE_SUB(NOW(),INTERVAL ? DAY)",[s.retentionDays]);
    const [expired]=await pool.query<Ticket[]>("SELECT * FROM discord_tickets WHERE guild_id=? AND status='closed' AND closed_at<DATE_SUB(NOW(),INTERVAL ? DAY)",[config.DISCORD_GUILD_ID,s.retentionDays]);
    for(const t of expired) {
      const c=await client.channels.fetch(t.channel_id).catch(()=>null);
      if(c?.type===ChannelType.GuildText&&c.guildId===config.DISCORD_GUILD_ID&&c.topic===`CobbleStar · ${t.id}`) await c.delete("Expiration de la conservation du ticket fermé");
      await pool.execute("DELETE FROM discord_tickets WHERE id=? AND status='closed'",[t.id]);
    }
    // Exact IDs only; also purges an old destination after configuration changes.
    const [posts]=await pool.query<RowDataPacket[]>("SELECT * FROM discord_log_posts WHERE guild_id=? AND created_at<DATE_SUB(NOW(),INTERVAL ? DAY) LIMIT 500",[config.DISCORD_GUILD_ID,s.retentionDays]);
    for(const post of posts) {
      try {
        const c=await textChannel(post.channel_id);
        const message=await c.messages.fetch(post.message_id);
        if(message.author.id===client.user!.id) await message.delete();
      } catch(error) {
        // Only already deleted resources count as a successful purge. Permission errors retry later.
        if(!error||typeof error!=="object"||!("code" in error)||![10003,10008].includes(Number(error.code))) continue;
      }
      await pool.execute("DELETE FROM discord_log_posts WHERE message_id=?",[post.message_id]);
    }
  }
  async function tick() {
    if(busy||stopped||!client.isReady()) return;
    busy=true;
    try {
      const [owned]=await lock.query<RowDataPacket[]>("SELECT IS_USED_LOCK(?)=CONNECTION_ID() AS owned",[lockName]);
      if(Number(owned[0]?.owned)!==1) { await stop(); return; }
      const s=await settings();
      const [events]=await pool.query<RowDataPacket[]>("SELECT * FROM discord_event_outbox WHERE delivered_at IS NULL AND available_at<=NOW() ORDER BY created_at LIMIT 10");
      for(const e of events) {
        try {
          const kind=e.kind as EventKind;
          if(kind==="private"&&!s.privateEnabled) { await pool.execute("DELETE FROM discord_event_outbox WHERE id=?",[e.id]); continue; }
          const c=await destination(s,kind), body=json<{text:string}>(e.body);
          // One Discord request per event: long messages become plain text attachments.
          const payload={content:plain(body.text,1900),...(body.text.length>1900?{files:[new AttachmentBuilder(Buffer.from(body.text,"utf8"),{name:"journal.txt"})]}:{}),allowedMentions:noMentions};
          if(["gts","minigame"].includes(kind)) await c.send(payload); else await sendLog(c,payload);
          await pool.execute("UPDATE discord_event_outbox SET delivered_at=NOW(),body=? WHERE id=?",[JSON.stringify({text:"Livré"}),e.id]);
        } catch {
          const retry=Math.min(3600,30*2**Math.min(Number(e.attempts),7));
          await pool.execute("UPDATE discord_event_outbox SET attempts=attempts+1,available_at=DATE_ADD(NOW(),INTERVAL ? SECOND) WHERE id=?",[retry,e.id]);
          if(Number(e.attempts)===0) log.warn({kind:e.kind},"Livraison Discord reportée : vérifier salon et permissions.");
        }
      }
      await cleanup(s);
    } finally { busy=false; }
  }
  try {
    await new Promise<void>((resolve,reject)=> {
      const timeout=setTimeout(()=>reject(new Error("Connexion Discord expirée")),30_000);
      client.once(Events.ClientReady,()=> {clearTimeout(timeout);resolve();});
      void client.login(config.DISCORD_BOT_TOKEN).catch(e=> {clearTimeout(timeout);reject(e);});
    });
    const g=await guild();
    const existing=await g.commands.fetch();
    for(const definition of discordCommands()) {
      const command=existing.find(c=>c.name===definition.name);
      if(command) await client.rest.patch(Routes.applicationGuildCommand(client.user!.id,g.id,command.id),{body:definition});
      else await client.rest.post(Routes.applicationGuildCommands(client.user!.id,g.id),{body:definition});
    }
    // Preserve unrelated application's slash commands. Restart recovery keeps tickets readable.
    await pool.execute("UPDATE discord_tickets SET status='a_fermer' WHERE guild_id=? AND status='closing'",[g.id]);
    await snapshotInvites(g);
    timer=setInterval(()=>safe(tick),5000);
    log.info("Bot CobbleStar connecté ; commandes /ticket et /csconfig disponibles.");
    return stop;
  } catch(error) { await stop(); throw error; }
}
