import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,ChannelType,EmbedBuilder,MessageFlags,ModalBuilder,PermissionFlagsBits as P,
  SlashCommandBuilder,TextInputBuilder,TextInputStyle,type Guild,type GuildMember,type Interaction,type TextChannel} from "discord.js";
import type {FastifyBaseLogger} from "fastify";
import type {Settings} from "./discord-policy.js";
import {communityKinds,kindNames,eventDraft,eventError,parisDate,CommunityEventStore,type CommunityEvent,type Participant,type EventNotice} from "./discord-community-events.js";

const noMentions={parse:[] as never[]};
const ephemeral={flags:MessageFlags.Ephemeral} as const;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const button=(id:string,label:string,style=ButtonStyle.Secondary,disabled=false)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
const row=(...buttons:ButtonBuilder[])=>new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
export function communityEventCommand() {
  return new SlashCommandBuilder().setName("evenement").setDescription("Événements CobbleStar et inscriptions")
    .addSubcommand(s=>s.setName("creer").setDescription("Créer une annonce avec formulaire (staff)")
      .addStringOption(o=>o.setName("type").setDescription("Activité").setRequired(true).addChoices(...communityKinds.map(value=>({name:kindNames[value],value})))))
    .addSubcommand(s=>s.setName("liste").setDescription("Voir les événements à venir et en cours"))
    .addSubcommand(s=>s.setName("participants").setDescription("Voir les inscrits et la liste d’attente")
      .addStringOption(o=>o.setName("id").setDescription("Identifiant indiqué sous l’annonce").setRequired(true).setMaxLength(36))
      .addIntegerOption(o=>o.setName("page").setDescription("Page").setMinValue(1).setMaxValue(200))
      .addBooleanOption(o=>o.setName("export").setDescription("Télécharger la liste complète (staff)")))
    .addSubcommand(s=>s.setName("modifier").setDescription("Modifier le programme ou les places (staff)")
      .addStringOption(o=>o.setName("id").setDescription("Identifiant de l’événement").setRequired(true).setMaxLength(36)))
    .addSubcommand(s=>s.setName("annuler").setDescription("Annuler avec motif et confirmation (staff)")
      .addStringOption(o=>o.setName("id").setDescription("Identifiant de l’événement").setRequired(true).setMaxLength(36))).toJSON();
}
function field(id:string,label:string,value:string,max:number,paragraph=false) {
  const input=new TextInputBuilder().setCustomId(id).setLabel(label).setValue(value).setMaxLength(max).setRequired(true).setStyle(paragraph?TextInputStyle.Paragraph:TextInputStyle.Short);
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}
function form(customId:string,e?:CommunityEvent) {
  let date=e?parisDate(Number(e.starts_at_ms)):"";
  // Preserve the selected occurrence when editing a repeated hour in autumn.
  if(e)try{eventDraft({title:e.title,details:e.details,kind:e.kind,date,duration:"60",capacity:"0"},Number(e.starts_at_ms)-60000);}
  catch{date=new Date(Number(e.starts_at_ms)).toISOString().slice(0,16)+"Z";}
  return new ModalBuilder().setCustomId(customId).setTitle(e?"Modifier l’événement":"Nouvel événement CobbleStar").addComponents(
    field("title","Titre",e?.title??"",100),field("date","Début · JJ/MM/AAAA HH:mm · Paris",date,32),
    field("duration","Durée en minutes (15–1440)",e?String((Number(e.ends_at_ms)-Number(e.starts_at_ms))/60000):"60",4),
    field("capacity","Places (0 = sans limite de places)",e?String(e.capacity):"32",3),
    field("details","Lieu / rendez-vous / règles",e?.details??"",1000,true));
}
export function eventCard(e:CommunityEvent,people:Participant[],now=Date.now()) {
  const confirmed=people.filter(p=>p.status==="confirmed").length,waiting=people.length-confirmed;
  const closed=e.status!=="scheduled"||now>=Number(e.starts_at_ms);
  const status=e.status==="cancelled"?"ANNULÉ":e.status==="finished"?"TERMINÉ":closed?"EN COURS":"INSCRIPTIONS OUVERTES";
  const embed=new EmbedBuilder().setColor(e.status==="cancelled"?0xe881a6:0xa694ee).setTitle(e.title).setDescription(e.details)
    .setAuthor({name:`COBBLESTAR · ${kindNames[e.kind]}`}).addFields(
      {name:"Début",value:`<t:${Math.floor(Number(e.starts_at_ms)/1000)}:F>\n<t:${Math.floor(Number(e.starts_at_ms)/1000)}:R>`,inline:true},
      {name:"Durée",value:`${(Number(e.ends_at_ms)-Number(e.starts_at_ms))/60000} min`,inline:true},
      {name:"Inscriptions",value:`${confirmed}${e.capacity?` / ${e.capacity}`:" · places libres"} confirmé(s)\n${waiting} en attente`,inline:true},
      {name:"Statut",value:status});
  if(e.cancel_reason)embed.addFields({name:"Motif de l’annulation",value:e.cancel_reason});
  embed.setFooter({text:`ID : ${e.id} · Ton inscription sera visible dans la liste. MP facultatifs.`});
  return {embeds:[embed],components:[row(button(`cs:event:join:${e.id}`,"S’inscrire",ButtonStyle.Primary,closed),
    button(`cs:event:leave:${e.id}`,"Se désinscrire",ButtonStyle.Secondary,closed),button(`cs:event:roster:${e.id}`,"Participants"),
    button(`cs:event:dm:${e.id}`,"Rappels MP"))],allowedMentions:noMentions};
}
export function participantPage(e:CommunityEvent,people:Participant[],requested=1) {
  const sorted=[...people.filter(p=>p.status==="confirmed"),...people.filter(p=>p.status==="waiting")];
  const pages=Math.max(1,Math.ceil(sorted.length/25)),page=Math.min(pages,Math.max(1,requested));
  const lines=sorted.slice((page-1)*25,page*25).map(p=>`${p.status==="confirmed"?"✅":"⏳"} <@${p.user_id}>`);
  return {embeds:[new EmbedBuilder().setColor(0xa694ee).setTitle(`Participants · ${e.title}`).setDescription(lines.join("\n")||"Aucune inscription.")
    .setFooter({text:`Page ${page}/${pages} · ✅ Confirmé · ⏳ Liste d’attente (ordre d’inscription)`})],
    components:pages>1?[row(button(`cs:event:page:${e.id}:${page-1}`,"Précédent",ButtonStyle.Secondary,page<=1),
      button(`cs:event:page:${e.id}:${page+1}`,"Suivant",ButtonStyle.Secondary,page>=pages))]:[],allowedMentions:noMentions};
}
export class DiscordCommunityEvents {
  private publishing=new Set<string>();
  private publishAt=new Map<string,number>();
  private cleanupAt=0;
  private warnAt=0;
  constructor(private guild:()=>Promise<Guild>,private botId:()=>string,private log:FastifyBaseLogger,private store=new CommunityEventStore()) {}
  owns(i:Interaction) {return i.isChatInputCommand()?i.commandName==="evenement":(i.isButton()||i.isModalSubmit())&&i.customId.startsWith("cs:event:");}
  private staff(m:GuildMember,s:Settings) {if(!m.permissions.has(P.Administrator)&&!(s.staffRole&&m.roles.cache.has(s.staffRole)))return eventError("Action réservée au staff des événements.");}
  private async channel(id:string,m?:GuildMember,send=false) {
    const g=await this.guild(),c=await g.channels.fetch(id);
    if(!c||c.type!==ChannelType.GuildText)return eventError("Le salon de l’événement est introuvable.");
    if(m&&!c.permissionsFor(m)?.has(P.ViewChannel))return eventError("Tu n’as pas accès au salon de cet événement.");
    if(send) {
      const me=await g.members.fetchMe();
      if(!c.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]))return eventError("Le bot doit voir le salon et avoir Envoyer des messages, Intégrer des liens et Voir les anciens messages.");
    }
    return c;
  }
  private async event(id:string,m:GuildMember) {
    if(!idPattern.test(id))return eventError("Identifiant invalide. Copie l’ID complet sous l’annonce.");
    const g=await this.guild(),e=await this.store.get(g.id,id);
    if(!e)return eventError("Événement introuvable dans ce serveur.");
    await this.channel(e.channel_id,m);return e;
  }
  async handle(i:Interaction,s:Settings) {
    if(!this.owns(i)||!i.isChatInputCommand()&&!i.isModalSubmit()&&!i.isButton())return;
    const g=await this.guild();
    if(i.guildId!==g.id)return eventError("Utilise cette commande dans le serveur CobbleStar.");
    const sub=i.isChatInputCommand()?i.options.getSubcommand():null;
    const modal=sub==="creer"||sub==="modifier"||sub==="annuler";
    if(!modal&&!i.deferred&&!i.replied)await i.deferReply(ephemeral);
    const m=await g.members.fetch(i.user.id);
    if(m.user.bot)return eventError("Les inscriptions sont réservées aux joueurs.");
    if(i.isChatInputCommand()) {
      if(sub==="creer") {
        this.staff(m,s);const kind=i.options.getString("type",true);
        if(!communityKinds.some(k=>k===kind))return eventError("Activité inconnue.");
        await this.channel(i.channelId!,m,true);
        await i.showModal(form(`cs:event:create:${kind}`));return;
      }
      if(sub==="liste") {
        const all=await this.store.list(g.id),visible:CommunityEvent[]=[];
        for(const e of all)try{await this.channel(e.channel_id,m);visible.push(e);}catch{/* No information about inaccessible events. */}
        const lines=visible.map(e=>`**${e.title.replace(/[\r\n]/g," ")}** · <t:${Math.floor(Number(e.starts_at_ms)/1000)}:f>\n${e.message_id?`https://discord.com/channels/${g.id}/${e.channel_id}/${e.message_id}`:`ID : ${e.id} · annonce en attente`}`);
        const pages=Array.from({length:Math.ceil(lines.length/5)},(_,n)=>lines.slice(n*5,n*5+5).join("\n\n"));
        await i.editReply({content:pages[0]??"Aucun événement à venir accessible.",allowedMentions:noMentions});
        for(const page of pages.slice(1))await i.followUp({content:page,allowedMentions:noMentions,...ephemeral});return;
      }
      if(sub==="modifier"||sub==="annuler")this.staff(m,s);
      const e=await this.event(i.options.getString("id",true),m);
      if(sub==="modifier") {await i.showModal(form(`cs:event:edit:${e.id}`,e));return;}
      if(sub==="annuler") {
        await i.showModal(new ModalBuilder().setCustomId(`cs:event:cancel:${e.id}`).setTitle("Confirmer l’annulation")
          .addComponents(field("reason","Motif communiqué aux participants","",500,true),field("confirm","Écris ANNULER pour confirmer","",7)));return;
      }
      const people=await this.store.participants(e.id);
      if(i.options.getBoolean("export")) {
        this.staff(m,s);const lines=people.map(p=>`${p.user_id}\t${p.status==="confirmed"?"Confirmé":"Liste d’attente"}\t${p.position}`);
        await i.editReply({content:`Liste complète : ${people.length} inscription(s).`,files:[new AttachmentBuilder(Buffer.from(["Discord ID\tStatut\tOrdre",...lines].join("\n"),"utf8"),{name:`participants-${e.id}.txt`})],allowedMentions:noMentions});
      }else await i.editReply(participantPage(e,people,i.options.getInteger("page")??1));return;
    }
    const [,prefix,action,value,page]=i.customId.split(":");
    if(prefix!=="event")return eventError("Action invalide.");
    if(i.isModalSubmit()) {
      this.staff(m,s);
      if(action==="cancel") {
        const e=await this.event(value??"",m),reason=i.fields.getTextInputValue("reason").trim();
        if(i.fields.getTextInputValue("confirm").trim()!=="ANNULER"||!reason)return eventError("Écris ANNULER et indique un motif. Rien n’a été annulé.");
        await this.store.cancel(g.id,e.id,reason);await this.publish(e.id);
        await i.editReply({content:"Événement annulé. L’annonce sera mise à jour et les rappels ordinaires sont arrêtés.",allowedMentions:noMentions});return;
      }
      const e=action==="edit"?await this.event(value??"",m):undefined;
      if(action!=="create"&&action!=="edit")return eventError("Formulaire inconnu.");
      const d=eventDraft({title:i.fields.getTextInputValue("title"),details:i.fields.getTextInputValue("details"),date:i.fields.getTextInputValue("date"),
        duration:i.fields.getTextInputValue("duration"),capacity:i.fields.getTextInputValue("capacity"),kind:e?.kind??value??""});
      await this.channel(e?.channel_id??i.channelId!,m,true);
      if(e)await this.store.edit(g.id,e.id,d);
      const saved=e??await this.store.create(g.id,m.id,i.channelId!,i.id,d);
      await this.publish(saved.id);const latest=await this.store.get(g.id,saved.id);
      await i.editReply({content:`Événement ${e?"modifié":"enregistré"}. ID : ${saved.id}\n${latest?.message_id?`Annonce : https://discord.com/channels/${g.id}/${saved.channel_id}/${latest.message_id}`:"Publication en attente : le bot réessaiera automatiquement."}`,allowedMentions:noMentions});return;
    }
    const e=await this.event(value??"",m);
    if(["join","leave","dm"].includes(action??"")&&(i.channelId!==e.channel_id||i.message.id!==e.message_id))return eventError("Utilise les boutons de l’annonce actuelle de cet événement.");
    if(action==="roster"||action==="page") {
      if(action==="page"&&(!page||!/^\d{1,3}$/.test(page)))return eventError("Page invalide.");
      await i.editReply(participantPage(e,await this.store.participants(e.id),Number(page??1)));return;
    }
    let content:string;
    if(action==="join") {
      const result=await this.store.join(g.id,e.id,m.id);
      content=result.status==="confirmed"?"✅ Tu es inscrit. Ton inscription est visible dans la liste.":"⏳ Tu es sur liste d’attente. Les places libérées vont aux premiers inscrits en attente.";
      content+="\nLe bouton Rappels MP permet d’activer les rappels privés (facultatifs).";
    }else if(action==="leave") {await this.store.leave(g.id,e.id,m.id);content="Désinscription enregistrée. Tes rappels privés sont arrêtés.";}
    else if(action==="dm") {
      const enabled=await this.store.toggleDm(g.id,e.id,m.id);
      content=enabled?"Rappels MP activés pour cet événement : 24 h, 1 h, 10 min et début. En attente, tu seras aussi prévenu si une place se libère. Discord peut bloquer les MP ; les rappels restent visibles dans le salon.":"Rappels MP désactivés pour cet événement.";
    }else return eventError("Action inconnue.");
    await i.editReply({content,allowedMentions:noMentions});await this.publish(e.id);
  }
  async publish(id:string) {
    const now=Date.now();if(this.publishing.has(id)||now<(this.publishAt.get(id)??0))return;
    this.publishing.add(id);this.publishAt.set(id,now+3000);
    if(this.publishAt.size>1000)this.publishAt.delete(this.publishAt.keys().next().value!);
    try {
      const g=await this.guild(),e=await this.store.get(g.id,id);if(!e)return;
      if(e.message_id&&Number(e.published_revision)>=Number(e.revision))return;
      const c=await this.channel(e.channel_id,undefined,true),payload=eventCard(e,await this.store.participants(id));
      let message=e.message_id?await c.messages.fetch(e.message_id).catch(error=>{if(Number(error?.code)===10008)return null;throw error;}):null;
      if(message&&message.author.id!==this.botId())return eventError("L’annonce configurée n’appartient pas au bot.");
      if(message)await message.edit(payload);else message=await c.send(payload);
      await this.store.published(e,message.id);
    }catch {
      await this.store.publishFailed(id);this.warn();
    }finally{this.publishing.delete(id);}
  }
  private warn() {if(Date.now()>this.warnAt){this.warnAt=Date.now()+60000;this.log.warn("Événement Discord : publication/rappel reporté, vérifier salons et permissions. Données conservées.");}}
  private async deliver(n:EventNotice) {
    const g=await this.guild(),e=await this.store.get(g.id,n.event_id),now=Date.now();
    if(!e||Number(e.schedule_version)!==Number(n.schedule_version)||Number(n.expires_at_ms)<=now
      ||(n.kind==="cancel"?e.status!=="cancelled":e.status==="cancelled"||e.status==="finished"))return this.store.noticeState(n,"skipped");
    const label=n.kind==="cancel"?`Événement annulé : ${e.cancel_reason}`:n.kind.startsWith("place:")?"Une place s’est libérée : ton inscription est confirmée !":n.kind==="start"?"L’événement a commencé !":`Rappel ${n.kind} : rendez-vous <t:${Math.floor(Number(e.starts_at_ms)/1000)}:R>.`;
    const payload={content:`**${e.title}**\n${label}\nDébut : <t:${Math.floor(Number(e.starts_at_ms)/1000)}:F>\n${e.message_id?`https://discord.com/channels/${g.id}/${e.channel_id}/${e.message_id}`:`<#${e.channel_id}>`}`,allowedMentions:noMentions};
    try {
      if(n.user_id) {
        const p=(await this.store.participants(e.id)).find(p=>p.user_id===n.user_id);
        if(!p?.dm_reminders||n.kind!=="cancel"&&p.status!=="confirmed"||n.kind.startsWith("place:")&&n.kind!==`place:${p?.position}`)return this.store.noticeState(n,"skipped");
        const member=await g.members.fetch(n.user_id);if(member.user.bot)return this.store.noticeState(n,"skipped");
        // Never disclose an event after source-channel access has been revoked.
        await this.channel(e.channel_id,member);
        await member.send(payload);
      }else await (await this.channel(e.channel_id,undefined,true)).send(payload);
      await this.store.noticeState(n,"sent");
    }catch(error) {
      const permanent=error&&typeof error==="object"&&"code"in error&&[50007,10007].includes(Number(error.code));
      if(error instanceof Error&&error.message.startsWith("USER:Tu n’as pas accès")||permanent)await this.store.noticeState(n,"skipped");
      else {await this.store.noticeState(n,"pending");this.warn();}
    }
  }
  async tick(s:Settings) {
    try {
      const g=await this.guild(),now=Date.now(),purge=now>=this.cleanupAt;
      await this.store.housekeeping(g.id,s.retentionDays,now,purge);if(purge)this.cleanupAt=now+3600000;
      for(const e of await this.store.dirty(g.id))await this.publish(e.id);
      for(const n of await this.store.due(g.id))await this.deliver(n);
    }catch{this.warn();}
  }
}
