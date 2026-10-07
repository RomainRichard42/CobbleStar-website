import {SlashCommandBuilder,PermissionFlagsBits as P,ChannelType,type ChatInputCommandInteraction,type Guild} from 'discord.js';
import {ReferralStore,milestones,inviteeHours,inviteeLabels} from './referrals.js';
export function referralCommands(){
 const publicCommand=new SlashCommandBuilder().setName('parrainage').setDescription('Inviter des joueurs et suivre les récompenses')
  .addSubcommand(s=>s.setName('statut').setDescription('Mes filleuls, mon temps de jeu et les paliers'))
  .addSubcommand(s=>s.setName('lien').setDescription('Créer mon lien personnel dans ce salon'));
 const admin=new SlashCommandBuilder().setName('parrainage-admin').setDescription('Configuration et réparation du parrainage').setDefaultMemberPermissions(P.Administrator)
  .addSubcommand(s=>s.setName('config').setDescription('Activer ou suspendre les nouvelles validations')
   .addBooleanOption(o=>o.setName('actif').setDescription('Événement actif').setRequired(true))
   .addIntegerOption(o=>o.setName('heures').setDescription('Temps hors AFK par filleul (1 à 240)').setMinValue(1).setMaxValue(240)))
  .addSubcommand(s=>s.setName('palier').setDescription('Clés Vote des futurs déblocages ; les récompenses acquises restent inchangées')
   .addIntegerOption(o=>o.setName('filleuls').setDescription('Palier').setRequired(true).addChoices(...milestones.map(n=>({name:String(n),value:n}))))
   .addIntegerOption(o=>o.setName('cles').setDescription('Clés Vote pour le parrain (0 à 64)').setRequired(true).setMinValue(0).setMaxValue(64)))
  .addSubcommand(s=>s.setName('attribuer').setDescription('Réparer uniquement une invitation indéterminée, avec trace admin')
   .addUserOption(o=>o.setName('filleul').setDescription('Nouveau membre').setRequired(true))
   .addUserOption(o=>o.setName('parrain').setDescription('Invitant réel').setRequired(true)));
 return [publicCommand.toJSON(),admin.toJSON()];
}
export async function handleReferral(i:ChatInputCommandInteraction,g:Guild,store=new ReferralStore()){
 const sub=i.options.getSubcommand();
 if(i.commandName==='parrainage-admin'){
  const member=await g.members.fetch(i.user.id);if(!member.permissions.has(P.Administrator))throw new Error('USER:Administrateur uniquement.');
  if(sub==='config')await store.configure(g.id,i.user.id,{enabled:i.options.getBoolean('actif',true),...(i.options.getInteger('heures')?{seconds:i.options.getInteger('heures')!*3600}:{})});
  if(sub==='palier'){
   const current=await store.status(g.id,i.user.id),keys=[...current.cfg.keys];keys[milestones.indexOf(i.options.getInteger('filleuls',true) as 1|2|3|4)]=i.options.getInteger('cles',true);
   await store.configure(g.id,i.user.id,{keys});
  }
  if(sub==='attribuer'){
   const child=i.options.getUser('filleul',true),parent=i.options.getUser('parrain',true);
   if(child.bot||parent.bot)throw new Error('USER:Un bot ne peut pas participer.');
   await store.attribute(g.id,i.user.id,child.id,parent.id);
  }
  await i.editReply({content:'Parrainage enregistré. Les récompenses déjà acquises ne sont ni retirées ni redistribuées.'});return;
 }
 const status=await store.status(g.id,i.user.id);
 if(sub==='lien'){
  if(!status.cfg.enabled)throw new Error('USER:Le parrainage est suspendu.');
  const channel=await g.channels.fetch(i.channelId!);
  if(!channel||channel.type!==ChannelType.GuildText)throw new Error('USER:Utilise un salon texte du serveur.');
  const invite=await channel.createInvite({unique:true,maxAge:0,maxUses:0,reason:'Lien personnel de parrainage CobbleStar'});
  await store.invite(g.id,invite.code,i.user.id);
  await i.editReply({content:`Ton lien personnel : https://discord.gg/${invite.code}\nLe filleul doit être nouveau, lier son compte avec /link et jouer ${status.cfg.seconds/3600} h hors AFK. Ton compte Minecraft doit aussi être lié.`});return;
 }
 const progress=status.own?`${status.own.qualified_uuid?'Validé ✓':`${Math.floor(Number(status.own.active_seconds??0)/60)} / ${status.cfg.seconds/60} min hors AFK`} · ${status.own.inviter_id?'parrain identifié':'invitation indéterminée : demander au staff'}`:'Pas de parrainage enregistré pour ton arrivée.';
 await i.editReply({content:`**Parrainage CobbleStar** · ${status.cfg.enabled?'actif':'suspendu'}\nFilleuls : ${status.qualified} validés / ${status.invited} invités\nTon arrivée : ${progress}\n\n**Parrain — chaque filleul doit jouer ${status.cfg.seconds/3600} h hors AFK**\n${milestones.map((n,k)=>`${status.qualified>=n?'✓':'○'} ${n} filleul(s) : ${status.cfg.keys[k]} clé(s) Vote${n===4?' + skin Dracolosse Alliance':''}`).join('\n')}\n\n**Filleul — ton propre temps hors AFK**\n${inviteeHours.map((h,k)=>`${status.own&&Number(status.own.active_seconds??0)>=h*3600?'✓':'○'} ${h} h : ${inviteeLabels[k]}`).join('\n')}\n\nLes deux parcours sont séparés. En jeu : /parrainage ; /parrainage recuperer pour les objets. Les clés sont utilisables directement sur leur caisse. Une invitation ambiguë reste à vérifier par le staff.`,allowedMentions:{parse:[]}});
}
