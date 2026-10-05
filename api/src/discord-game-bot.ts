import {ChannelType,PermissionFlagsBits as P,type Guild,type Role,type GuildMember,type VoiceChannel} from "discord.js";
import type {FastifyBaseLogger} from "fastify";
import type {Settings} from "./discord-policy.js";
import {json,saveSettings} from "./discord-store.js";
import {desiredRoles,gameProfileSchema,gameStatus,roleCandidates,saveRoleState,statusNames,type RoleCandidate} from "./discord-game.js";

const privileged=[P.Administrator,P.ManageGuild,P.ManageRoles,P.ManageChannels,P.KickMembers,P.BanMembers,
  P.ModerateMembers,P.ManageMessages,P.ManageWebhooks,P.ManageThreads,P.ManageEvents,P.MentionEveryone,P.ViewAuditLog,
  P.ManageNicknames,P.MuteMembers,P.DeafenMembers,P.MoveMembers,P.ManageGuildExpressions,P.ViewGuildInsights];
const error=(text:string):never=>{throw new Error(`USER:${text}`);};
export function safeSyncRole(role:Role,me:GuildMember,s:Settings) {
  if(role.id===role.guild.id||role.managed||role.id===s.staffRole||role.id===s.adminRole
    ||privileged.some(p=>role.permissions.has(p)))return false;
  return me.permissions.has(P.ManageRoles)&&role.position<me.roles.highest.position;
}
export class DiscordGameSync {
  private cursor="";
  private rolesAt=0;
  private namesAt=new Map<string,number>();
  private checked=new Map<string,{signature:string;at:number}>();
  private warnAt=0;
  constructor(private guild:()=>Promise<Guild>,private log:FastifyBaseLogger) {}
  invalidate(id:string) {this.checked.delete(id);}
  async validateRole(s:Settings,roleId:string) {
    const g=await this.guild(),role=await g.roles.fetch(roleId),me=await g.members.fetchMe();
    if(!role||!safeSyncRole(role,me,s))return error("Rôle non synchronisable : aucun rôle staff/modération, @everyone ou rôle géré. Place le bot au-dessus et donne-lui Gérer les rôles.");
  }
  async setupStatus(s:Settings,categoryId?:string) {
    const g=await this.guild(),me=await g.members.fetchMe();
    const fetch=async(id:string)=>{
      try{return await g.channels.fetch(id);}catch(e){
        if(e&&typeof e==="object"&&"code"in e&&Number(e.code)===10003)return null;throw e;
      }
    };
    if(!me.permissions.has(P.ManageChannels))return error("Le bot doit avoir Gérer les salons.");
    const oldCategory=s.statusCategory;
    if(categoryId)s.statusCategory=categoryId;
    let category=s.statusCategory?await fetch(s.statusCategory):null;
    if(category&&category.type!==ChannelType.GuildCategory)return error("Choisis une catégorie de ce serveur.");
    if(!category&&s.statusCategory)return error("Catégorie introuvable. Choisis une catégorie existante ou efface son identifiant avant de recréer.");
    if(!category) {
      category=await g.channels.create({name:"🌌 COBBLESTAR",type:ChannelType.GuildCategory});
      s.statusCategory=category.id;await saveSettings(s);
    }
    for(const [field,name] of [["statusChannel","⚪ Serveur : En attente"],["playersChannel","👥 Joueurs : —"]] as const) {
      let channel=s[field]?await fetch(s[field]!):null;
      if(channel&&channel.type!==ChannelType.GuildVoice)return error("Un compteur configuré n’est plus un salon vocal. Corrige la configuration.");
      if(!channel) {
        channel=await g.channels.create({name,type:ChannelType.GuildVoice,parent:category.id,
          permissionOverwrites:[{id:g.id,allow:[P.ViewChannel],deny:[P.Connect,P.SendMessages]},
            {id:me.id,allow:[P.ViewChannel,P.ManageChannels],deny:[P.Connect]}]});
        s[field]=channel.id;await saveSettings(s);
      } else {
        if(channel.parentId!==category.id)await channel.setParent(category.id,{lockPermissions:false});
        // Keep public counters visible without allowing voice connections.
        await channel.permissionOverwrites.set([{id:g.id,allow:[P.ViewChannel],deny:[P.Connect,P.SendMessages]},
          {id:me.id,allow:[P.ViewChannel,P.ManageChannels],deny:[P.Connect]}]);
      }
    }
    if(oldCategory!==s.statusCategory)this.namesAt.clear();
    await this.updateStatus(s);
  }
  private async updateStatus(s:Settings) {
    if(!s.statusEnabled||!s.statusCategory||!s.statusChannel||!s.playersChannel)return;
    const now=Date.now();
    if([s.statusChannel,s.playersChannel].every(id=>now-(this.namesAt.get(id)??0)<300000))return;
    const value=await gameStatus(s.gameServerId),names=statusNames(value?.state??null,value?.at??0,now),g=await this.guild();
    const category=await g.channels.fetch(s.statusCategory);
    if(!category||category.type!==ChannelType.GuildCategory)return error("La catégorie de statut n’existe plus.");
    for(const [id,name] of [[s.statusChannel,names.status],[s.playersChannel,names.players]] as const) {
      if(now-(this.namesAt.get(id)??0)<300000)continue;
      const c=await g.channels.fetch(id) as VoiceChannel|null;
      if(!c||c.type!==ChannelType.GuildVoice||c.parentId!==category.id)return error("Un compteur est absent ou hors de la catégorie de statut.");
      const me=await g.members.fetchMe();
      if(!c.permissionsFor(me)?.has(P.ManageChannels))return error("Le bot ne peut pas renommer les compteurs.");
      // Coalesce player-count churn. discord.js still follows the actual API rate-limit headers.
      if(c.name!==name)await c.setName(name,"Compteur Minecraft CobbleStar");
      this.namesAt.set(id,now);
    }
  }
  async report(s:Settings) {
    const value=await gameStatus(s.gameServerId);
    const names=statusNames(value?.state??null,value?.at??0);
    return `${names.status}\n${names.players}\nSource : ${s.gameServerId} · dernière réception : ${value?new Date(value.at).toISOString():"aucune"}\nRôles : ${s.roleSyncEnabled?"actifs":"désactivés"} · ${s.roleMappings.length} association(s)\nCompteurs : ${s.statusEnabled?"actifs":"désactivés"} · actualisation visuelle jusqu’à 5 min.`;
  }
  private async syncCandidate(g:Guild,s:Settings,candidate:RoleCandidate,me:GuildMember) {
    const profile=candidate.profile?gameProfileSchema.parse(json(candidate.profile)):null;
    const owned=candidate.roles?json<string[]>(candidate.roles):[];
    // A missing snapshot for an unchanged link is not a grade loss (API/server outage).
    if(!profile&&candidate.uuid&&candidate.uuid===candidate.owner_uuid)return;
    const wanted=desiredRoles(s,profile);
    const signature=JSON.stringify([s.staffRole,s.adminRole,candidate.uuid,owned,wanted]);
    const last=this.checked.get(candidate.discord_id),now=Date.now();
    if(last?.signature===signature&&now-last.at<300000)return;
    let member:GuildMember;
    try {member=await g.members.fetch({user:candidate.discord_id,force:true});}
    catch(e) {
      if(e&&typeof e==="object"&&"code"in e&&Number(e.code)===10007) {
        await saveRoleState(candidate.discord_id,[],candidate.uuid);return;
      }
      throw e;
    }
    const roles=await g.roles.fetch();
    const involved=[...new Set([...owned,...wanted])];
    for(const id of involved) {
      const role=roles.get(id);
      // Deleted roles can be forgotten; newly privileged roles are NEVER added or removed.
      if(role&&!safeSyncRole(role,me,s))return error("Un rôle synchronisé est devenu privilégié ou dépasse le bot. Synchronisation de ce membre suspendue.");
      if(!role&&wanted.includes(id))return error("Un rôle configuré a été supprimé. Retire son association.");
    }
    await saveRoleState(candidate.discord_id,involved,candidate.uuid);
    // Only individual role endpoints: never replace a member's whole roles array.
    for(const id of owned)if(!wanted.includes(id)&&roles.has(id)&&member.roles.cache.has(id))await member.roles.remove(id,"Synchronisation Minecraft CobbleStar");
    for(const id of wanted)if(!member.roles.cache.has(id))await member.roles.add(id,"Synchronisation Minecraft CobbleStar");
    await saveRoleState(candidate.discord_id,wanted,candidate.uuid);
    if(this.checked.size>10000)this.checked.clear();
    this.checked.set(candidate.discord_id,{signature:JSON.stringify([s.staffRole,s.adminRole,candidate.uuid,wanted,wanted]),at:now});
  }
  async tick(s:Settings) {
    const report=()=>{if(Date.now()>this.warnAt){this.warnAt=Date.now()+60000;this.log.warn("Synchronisation Discord jeu reportée : vérifier /csconfig statut, rôles, hiérarchie et compteurs. Aucun secret affiché.");}};
    try {await this.updateStatus(s);}catch{report();}
    if(!s.roleSyncEnabled||Date.now()<this.rolesAt)return;
    this.rolesAt=Date.now()+15000;
    try {
      const candidates=await roleCandidates(s.gameServerId,this.cursor);
      if(!candidates.length){this.cursor="";return;}
      const g=await this.guild(),me=await g.members.fetchMe();
      for(const candidate of candidates) {
        try{await this.syncCandidate(g,s,candidate,me);}catch{report();}
        this.cursor=candidate.discord_id;
      }
    }catch{report();}
  }
}
