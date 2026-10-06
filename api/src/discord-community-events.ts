import {randomUUID} from "node:crypto";
import type {Pool,PoolConnection,RowDataPacket} from "mysql2/promise";
import {pool} from "./db.js";

export const communityKinds=["tournoi","raid","mini_jeux"] as const;
export type CommunityKind=typeof communityKinds[number];
export const kindNames={tournoi:"Tournoi",raid:"Raid communautaire",mini_jeux:"Soirée mini-jeux"};
export const eventError=(message:string):never=>{throw new Error(`USER:${message}`);};
const paris=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function parisDate(at:number) {const p=Object.fromEntries(paris.formatToParts(at).map(p=>[p.type,p.value]));return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;}
function validCivil(y:number,m:number,d:number,h:number,min:number) {
  const at=new Date(Date.UTC(y,m-1,d,h,min));
  return at.getUTCFullYear()===y&&at.getUTCMonth()===m-1&&at.getUTCDate()===d&&at.getUTCHours()===h&&at.getUTCMinutes()===min;
}
export function eventTime(text:string,now=Date.now()) {
  const value=text.trim(),fr=/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})$/.exec(value);
  const iso=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(value);
  let at:number;
  if(fr) {
    const [,ds,ms,ys,hs,mins]=fr,[y,m,d,h,min]=[ys,ms,ds,hs,mins].map(Number) as [number,number,number,number,number];
    if(!validCivil(y,m,d,h,min))return eventError("Date inexistante. Format : JJ/MM/AAAA HH:mm (heure de Paris).");
    const naive=Date.UTC(y,m-1,d,h,min),matches:number[]=[];
    for(let offset=-180;offset<=180;offset+=30) {
      const candidate=naive+offset*60000,parts=Object.fromEntries(paris.formatToParts(candidate).map(p=>[p.type,p.value]));
      if(Number(parts.year)===y&&Number(parts.month)===m&&Number(parts.day)===d&&Number(parts.hour)===h&&Number(parts.minute)===min)matches.push(candidate);
    }
    if(matches.length!==1)return eventError("Heure inexistante ou ambiguë au changement d’heure. Précise un horaire ISO avec décalage, par exemple 2026-10-25T02:30+02:00.");
    at=matches[0]!;
  } else if(iso) {
    const [,ys,ms,ds,hs,mins,zone]=iso;
    if(!validCivil(Number(ys),Number(ms),Number(ds),Number(hs),Number(mins))||zone!=="Z"&&(Number(zone!.slice(1,3))>14||Number(zone!.slice(4))>59||Number(zone!.slice(1,3))===14&&Number(zone!.slice(4))!==0))return eventError("Date ou décalage ISO invalide.");
    at=Date.parse(value);
  } else return eventError("Format : JJ/MM/AAAA HH:mm (heure de Paris), ou ISO avec décalage.");
  if(!Number.isFinite(at)||at<now+60000||at>now+365*86400000)return eventError("Choisis une date entre une minute et un an dans le futur.");
  return at;
}
export interface EventDraft {title:string;details:string;kind:CommunityKind;startsAt:number;endsAt:number;capacity:number;}
export function eventDraft(input:{title:string;details:string;kind:string;date:string;duration:string;capacity:string},now=Date.now()):EventDraft {
  const title=input.title.trim(),details=input.details.trim(),duration=Number(input.duration),capacity=Number(input.capacity);
  if(!title||title.length>100||!details||details.length>1000)return eventError("Titre requis (100 caractères maximum) et détails requis (1 000 maximum).");
  if(!communityKinds.some(k=>k===input.kind))return eventError("Type d’événement inconnu.");
  if(!/^\d+$/.test(input.duration)||!Number.isInteger(duration)||duration<15||duration>1440)return eventError("Durée : de 15 à 1 440 minutes.");
  if(!/^\d+$/.test(input.capacity)||!Number.isInteger(capacity)||capacity<0||capacity>500)return eventError("Places : de 1 à 500, ou 0 sans limite de places (5 000 inscriptions maximum).");
  const startsAt=eventTime(input.date,now);
  return {title,details,kind:input.kind as CommunityKind,startsAt,endsAt:startsAt+duration*60000,capacity};
}
export interface CommunityEvent extends RowDataPacket {
  id:string;guild_id:string;creator_id:string;channel_id:string;message_id:string|null;title:string;details:string;kind:CommunityKind;
  starts_at_ms:number;ends_at_ms:number;created_at_ms:number;capacity:number;status:"scheduled"|"running"|"cancelled"|"finished";
  cancel_reason:string|null;revision:number;published_revision:number;schedule_version:number;publish_retry_at_ms:number;
}
export interface Participant extends RowDataPacket {event_id:string;user_id:string;status:"confirmed"|"waiting";position:number;dm_reminders:number;joined_at_ms:number;confirmed_at_ms:number|null;}
export interface EventNotice extends RowDataPacket {event_id:string;schedule_version:number;kind:string;user_id:string;available_at_ms:number;expires_at_ms:number;attempts:number;}
export function reminderWindows(e:CommunityEvent) {
  const start=Number(e.starts_at_ms);
  return [{kind:"24h",at:start-86400000,expires:start-3600000},{kind:"1h",at:start-3600000,expires:start-600000},
    {kind:"10m",at:start-600000,expires:start},{kind:"start",at:start,expires:Math.min(start+600000,Number(e.ends_at_ms))}];
}
export class CommunityEventStore {
  constructor(private db:Pool=pool) {}
  private async atomic<T>(work:(c:PoolConnection)=>Promise<T>) {
    const c=await this.db.getConnection();try{await c.beginTransaction();const value=await work(c);await c.commit();return value;}
    catch(error){await c.rollback();throw error;}finally{c.release();}
  }
  private async locked(c:PoolConnection,guild:string,id:string) {
    const [rows]=await c.query<CommunityEvent[]>("SELECT * FROM discord_community_events WHERE guild_id=? AND id=? FOR UPDATE",[guild,id]);
    return rows[0]??eventError("Événement introuvable dans ce serveur.");
  }
  async get(guild:string,id:string) {
    const [rows]=await this.db.query<CommunityEvent[]>("SELECT * FROM discord_community_events WHERE guild_id=? AND id=?",[guild,id]);return rows[0];
  }
  async list(guild:string) {
    const [rows]=await this.db.query<CommunityEvent[]>("SELECT * FROM discord_community_events WHERE guild_id=? AND status IN ('scheduled','running') ORDER BY starts_at_ms LIMIT 50",[guild]);return rows;
  }
  async participants(id:string) {
    const [rows]=await this.db.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? ORDER BY position",[id]);return rows;
  }
  private open(e:CommunityEvent,now:number) {if(e.status!=="scheduled"||now>=Number(e.starts_at_ms))return eventError("Les inscriptions sont fermées : événement commencé, terminé ou annulé.");}
  private async notice(c:PoolConnection,e:CommunityEvent,kind:string,user:string,at:number,expires:number) {
    await c.execute(`INSERT INTO discord_community_notifications(event_id,schedule_version,kind,user_id,available_at_ms,expires_at_ms)
      VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE state=IF(state='skipped','pending',state)`,[e.id,e.schedule_version,kind,user,at,expires]);
  }
  private async reminders(c:PoolConnection,e:CommunityEvent,user:string,now:number) {
    for(const window of reminderWindows(e))if(window.at>=now)await this.notice(c,e,window.kind,user,window.at,window.expires);
  }
  async create(guild:string,actor:string,channel:string,interaction:string,d:EventDraft,now=Date.now()) {
    return this.atomic(async c=>{
      await c.execute("INSERT IGNORE INTO discord_settings(guild_id,settings) VALUES(?,'{}')",[guild]);
      await c.query("SELECT guild_id FROM discord_settings WHERE guild_id=? FOR UPDATE",[guild]);
      const [old]=await c.query<CommunityEvent[]>("SELECT * FROM discord_community_events WHERE interaction_id=? AND guild_id=?",[interaction,guild]);if(old[0])return old[0];
      const [count]=await c.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM discord_community_events WHERE guild_id=? AND status IN ('scheduled','running')",[guild]);
      if(Number(count[0]!.n)>=50)return eventError("Maximum 50 événements actifs. Termine ou annule les anciens.");
      const id=randomUUID();
      await c.execute(`INSERT INTO discord_community_events(id,guild_id,creator_id,channel_id,interaction_id,title,kind,details,starts_at_ms,ends_at_ms,created_at_ms,capacity)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,[id,guild,actor,channel,interaction,d.title,d.kind,d.details,d.startsAt,d.endsAt,now,d.capacity]);
      const e=await this.locked(c,guild,id);await this.reminders(c,e,"",now);return e;
    });
  }
  private async promote(c:PoolConnection,e:CommunityEvent,now:number) {
    const [rows]=await c.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? ORDER BY position",[e.id]);
    const confirmed=rows.filter(p=>p.status==="confirmed").length;
    const free=e.capacity===0?rows.length:Math.max(0,e.capacity-confirmed);
    for(const p of rows.filter(p=>p.status==="waiting").slice(0,free)) {
      await c.execute("UPDATE discord_community_participants SET status='confirmed',confirmed_at_ms=? WHERE event_id=? AND user_id=?",[now,e.id,p.user_id]);
      if(p.dm_reminders) {await this.notice(c,e,`place:${p.position}`,p.user_id,now,Number(e.starts_at_ms));await this.reminders(c,e,p.user_id,now);}
    }
  }
  async join(guild:string,id:string,user:string,now=Date.now()) {
    return this.atomic(async c=>{
      const e=await this.locked(c,guild,id);this.open(e,now);
      const [rows]=await c.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? ORDER BY position",[id]);
      const existing=rows.find(p=>p.user_id===user);if(existing)return {status:existing.status,already:true};
      if(rows.length>=5000)return eventError("Limite de sécurité : 5 000 inscriptions par événement.");
      const status=e.capacity===0||rows.filter(p=>p.status==="confirmed").length<e.capacity?"confirmed":"waiting";
      await c.execute("INSERT INTO discord_community_participants(event_id,user_id,status,joined_at_ms,confirmed_at_ms) VALUES(?,?,?,?,?)",[id,user,status,now,status==="confirmed"?now:null]);
      await c.execute("UPDATE discord_community_events SET revision=revision+1 WHERE id=?",[id]);return {status,already:false};
    });
  }
  async leave(guild:string,id:string,user:string,now=Date.now()) {
    await this.atomic(async c=>{
      const e=await this.locked(c,guild,id);this.open(e,now);
      await c.execute("DELETE FROM discord_community_participants WHERE event_id=? AND user_id=?",[id,user]);
      await c.execute("UPDATE discord_community_notifications SET state='skipped' WHERE event_id=? AND user_id=? AND state='pending'",[id,user]);
      await this.promote(c,e,now);await c.execute("UPDATE discord_community_events SET revision=revision+1 WHERE id=?",[id]);
    });
  }
  async toggleDm(guild:string,id:string,user:string,now=Date.now()) {
    return this.atomic(async c=>{
      const e=await this.locked(c,guild,id);
      const [rows]=await c.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? AND user_id=?",[id,user]);
      const p=rows[0]??eventError("Inscris-toi d’abord pour choisir les rappels privés.");const enabled=!p.dm_reminders;
      if(enabled)this.open(e,now);
      await c.execute("UPDATE discord_community_participants SET dm_reminders=? WHERE event_id=? AND user_id=?",[enabled,id,user]);
      if(enabled&&p.status==="confirmed")await this.reminders(c,e,user,now);
      else if(!enabled)await c.execute("UPDATE discord_community_notifications SET state='skipped' WHERE event_id=? AND user_id=? AND state='pending'",[id,user]);
      return enabled;
    });
  }
  async edit(guild:string,id:string,d:EventDraft,now=Date.now()) {
    await this.atomic(async c=>{
      const e=await this.locked(c,guild,id);this.open(e,now);
      const [rows]=await c.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? ORDER BY position",[id]);
      if(d.capacity>0&&rows.filter(p=>p.status==="confirmed").length>d.capacity)return eventError("Il y a déjà plus d’inscrits confirmés que ce nombre de places. Personne n’a été retiré.");
      const moved=Number(e.starts_at_ms)!==d.startsAt||Number(e.ends_at_ms)!==d.endsAt;
      await c.execute(`UPDATE discord_community_events SET title=?,details=?,starts_at_ms=?,ends_at_ms=?,capacity=?,revision=revision+1,
        schedule_version=schedule_version+?,publish_retry_at_ms=0 WHERE id=?`,[d.title,d.details,d.startsAt,d.endsAt,d.capacity,moved?1:0,id]);
      const next=await this.locked(c,guild,id);
      if(moved) {
        await c.execute("UPDATE discord_community_notifications SET state='skipped' WHERE event_id=? AND state='pending'",[id]);
        await this.reminders(c,next,"",now);
        for(const p of rows.filter(p=>p.status==="confirmed"&&p.dm_reminders))await this.reminders(c,next,p.user_id,now);
      }
      await this.promote(c,next,now);
    });
  }
  async cancel(guild:string,id:string,reason:string,now=Date.now()) {
    await this.atomic(async c=>{
      const e=await this.locked(c,guild,id);if(e.status!=="scheduled"&&e.status!=="running")return eventError("Événement déjà annulé ou terminé.");
      await c.execute("UPDATE discord_community_events SET status='cancelled',cancel_reason=?,closed_at_ms=?,revision=revision+1,publish_retry_at_ms=0 WHERE id=?",[reason.slice(0,500),now,id]);
      await c.execute("UPDATE discord_community_notifications SET state='skipped' WHERE event_id=? AND state='pending'",[id]);
      const [rows]=await c.query<Participant[]>("SELECT * FROM discord_community_participants WHERE event_id=? ORDER BY position",[id]);
      for(const p of rows.filter(p=>p.dm_reminders))await this.notice(c,e,"cancel",p.user_id,now,now+86400000);
    });
  }
  async housekeeping(guild:string,days:number,now=Date.now(),purge=true) {
    await this.db.execute("UPDATE discord_community_events SET status='finished',closed_at_ms=ends_at_ms,revision=revision+1 WHERE guild_id=? AND status IN ('scheduled','running') AND ends_at_ms<=?",[guild,now]);
    await this.db.execute("UPDATE discord_community_events SET status='running',revision=revision+1 WHERE guild_id=? AND status='scheduled' AND starts_at_ms<=?",[guild,now]);
    if(purge)await this.db.execute("DELETE FROM discord_community_events WHERE guild_id=? AND status IN ('finished','cancelled') AND closed_at_ms<?",[guild,now-days*86400000]);
  }
  async dirty(guild:string,now=Date.now()) {
    const [rows]=await this.db.query<CommunityEvent[]>("SELECT * FROM discord_community_events WHERE guild_id=? AND revision>published_revision AND publish_retry_at_ms<=? ORDER BY starts_at_ms LIMIT 10",[guild,now]);return rows;
  }
  async published(e:CommunityEvent,messageId:string) {
    await this.db.execute("UPDATE discord_community_events SET message_id=?,published_revision=?,publish_retry_at_ms=0 WHERE id=?",[messageId,e.revision,e.id]);
  }
  async publishFailed(id:string,now=Date.now()) {await this.db.execute("UPDATE discord_community_events SET publish_retry_at_ms=? WHERE id=?",[now+60000,id]);}
  async due(guild:string,now=Date.now()) {
    await this.db.execute(`UPDATE discord_community_notifications n JOIN discord_community_events e ON e.id=n.event_id
      SET n.state='skipped' WHERE e.guild_id=? AND n.state='pending' AND (n.expires_at_ms<=? OR n.schedule_version<>e.schedule_version)`,[guild,now]);
    const [rows]=await this.db.query<EventNotice[]>(`SELECT n.* FROM discord_community_notifications n JOIN discord_community_events e ON e.id=n.event_id
      WHERE e.guild_id=? AND n.state='pending' AND n.available_at_ms<=? ORDER BY n.available_at_ms LIMIT 20`,[guild,now]);return rows;
  }
  async noticeState(n:EventNotice,state:"sent"|"skipped"|"pending",now=Date.now()) {
    const retry=now+Math.min(3600000,30000*2**Math.min(Number(n.attempts),7));
    await this.db.execute(`UPDATE discord_community_notifications SET state=?,attempts=attempts+1,available_at_ms=IF(?='pending',?,available_at_ms)
      WHERE event_id=? AND schedule_version=? AND kind=? AND user_id=?`,[state,state,retry,n.event_id,n.schedule_version,n.kind,n.user_id]);
  }
}
