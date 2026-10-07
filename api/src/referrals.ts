import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool} from './db.js';
import {json} from './discord-store.js';
export const milestones=[1,2,3,4] as const;
export const inviteeHours=[1,3,5,10] as const;
export const inviteeLabels=['10 Super Balls','5 Bonbons Exp. L','15 Hyper Balls + 5 000 Cobblecoins','5 Bonbons Exp. XL + 10 000 Cobblecoins + 1 clé Pulsar'] as const;
const legacyMilestones=[1,3,5,10] as const;
export const referralConfig=z.object({enabled:z.boolean().default(true),seconds:z.number().int().min(3600).max(864000).default(18000),
 keys:z.array(z.number().int().min(0).max(64)).length(4).default([1,2,3,5])}).strict();
export type ReferralConfig=z.infer<typeof referralConfig>;
export interface Campaign extends RowDataPacket {id:string;config:ReferralConfig|string;started_at_ms:number;}
interface Member extends RowDataPacket {invitee_id:string;inviter_id:string|null;joined_at_ms:number;qualified_uuid:string|null;qualified_at_ms:number|null;active?:number;}
interface Account extends RowDataPacket {discord_id:string;minecraft_uuid:string;minecraft_linked_at:Date|string;}
export function referralEligible(member:Member,invitee:Account|undefined,inviter:Account|undefined,seconds:number,firstSeen:number,cfg:ReferralConfig) {
 return cfg.enabled&&member.active!==0&&!!invitee&&!!inviter&&member.invitee_id!==member.inviter_id&&invitee.minecraft_uuid!==inviter.minecraft_uuid
  &&seconds>=cfg.seconds&&firstSeen>=Number(member.joined_at_ms)-60000
  // users stores UTC DATETIME with second precision; compare at the same resolution.
  &&new Date(invitee.minecraft_linked_at).getTime()>=Math.floor(Number(member.joined_at_ms)/1000)*1000;
}
export function rewardPlan(count:number,cfg:ReferralConfig) {
 return milestones.flatMap((n,i)=>count>=n?[{milestone:n,keys:cfg.keys[i]!,alliance:n===4}]:[]);
}
export class ReferralStore {
 constructor(private db:Pool=pool){}
 private async atomic<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.db.getConnection();try{await c.beginTransaction();const r=await work(c);await c.commit();return r;}catch(e){await c.rollback();throw e;}finally{c.release();}}
 private async locked(c:PoolConnection,guild:string){
  await c.execute('INSERT IGNORE INTO referral_campaigns(guild_id,id,config,started_at_ms) VALUES(?,?,?,?)',[guild,randomUUID(),JSON.stringify(referralConfig.parse({})),Date.now()]);
  const [r]=await c.query<Campaign[]>('SELECT * FROM referral_campaigns WHERE guild_id=? FOR UPDATE',[guild]);return r[0]!;
 }
 async campaign(guild:string){return this.atomic(c=>this.locked(c,guild));}
 async configure(guild:string,actor:string,patch:Partial<ReferralConfig>){return this.atomic(async c=>{
  const campaign=await this.locked(c,guild),cfg=referralConfig.parse({...json(campaign.config),...patch});
  await c.execute('UPDATE referral_campaigns SET config=? WHERE guild_id=?',[JSON.stringify(cfg),guild]);
  await c.execute('INSERT INTO referral_audit VALUES(?,?,?,?,?,?)',[randomUUID(),guild,actor,'config',JSON.stringify(cfg),Date.now()]);return cfg;
 });}
 async invite(guild:string,code:string,owner:string){await this.db.execute('INSERT INTO referral_invites VALUES(?,?,?)',[guild,code,owner]);}
 async joined(guild:string,id:string,at:number,code:string|null,inferred:string|null){await this.atomic(async c=>{
  const event=await this.locked(c,guild);
  // A paused campaign must still track the return of an already registered member.
  await c.execute('UPDATE referral_members SET active=1 WHERE guild_id=? AND invitee_id=?',[guild,id]);
  if(!referralConfig.parse(json(event.config)).enabled||at<Number(event.started_at_ms))return;
  const [r]=await c.query<RowDataPacket[]>('SELECT owner_id FROM referral_invites WHERE guild_id=? AND code=?',[guild,code??'']);
  const inviter=r[0]?.owner_id??inferred;
  await c.execute('INSERT IGNORE INTO referral_members(guild_id,invitee_id,inviter_id,joined_at_ms) VALUES(?,?,?,?)',[guild,id,inviter===id?null:inviter,at]);
  await c.execute('UPDATE referral_members SET active=1 WHERE guild_id=? AND invitee_id=?',[guild,id]);
 });}
 async left(guild:string,id:string){await this.db.execute('UPDATE referral_members SET active=0 WHERE guild_id=? AND invitee_id=?',[guild,id]);}
 async attribute(guild:string,actor:string,invitee:string,inviter:string){return this.atomic(async c=>{
  await this.locked(c,guild);if(invitee===inviter)throw new Error('USER:Impossible de se parrainer soi-même.');
  const [r]=await c.query<Member[]>('SELECT * FROM referral_members WHERE guild_id=? AND invitee_id=? FOR UPDATE',[guild,invitee]);
  if(!r[0]||r[0].qualified_uuid||r[0].inviter_id)throw new Error('USER:Seule une nouvelle arrivée avec invitation indéterminée peut être corrigée.');
  await c.execute('UPDATE referral_members SET inviter_id=? WHERE guild_id=? AND invitee_id=?',[inviter,guild,invitee]);
  await c.execute('INSERT INTO referral_audit VALUES(?,?,?,?,?,?)',[randomUUID(),guild,actor,'attribute',JSON.stringify({invitee,inviter}),Date.now()]);
 });}
 private async rewards(c:PoolConnection,guild:string,inviterId:string,cfg:ReferralConfig){
  const [links]=await c.query<Member[]>('SELECT * FROM referral_members WHERE guild_id=? AND inviter_id=? AND qualified_uuid IS NOT NULL',[guild,inviterId]);
  const [accounts]=await c.query<Account[]>("SELECT discord_id,minecraft_uuid,DATE_FORMAT(minecraft_linked_at,'%Y-%m-%dT%H:%i:%sZ') AS minecraft_linked_at FROM users WHERE discord_id=? AND minecraft_linked_at IS NOT NULL AND merged_into IS NULL",[inviterId]);
  const inviter=accounts[0];if(!inviter)return;
  await c.execute('INSERT IGNORE INTO referral_identities VALUES(?,?,?)',[guild,inviterId,inviter.minecraft_uuid]);
  const [bound]=await c.query<RowDataPacket[]>('SELECT uuid FROM referral_identities WHERE guild_id=? AND discord_id=?',[guild,inviterId]);
  if(bound[0]?.uuid!==inviter.minecraft_uuid)return;
  const [legacy]=await c.query<RowDataPacket[]>("SELECT milestone,vote_keys FROM referral_rewards WHERE guild_id=? AND uuid=? AND role='inviter'",[guild,inviter.minecraft_uuid]);
  // Map the old four stages to the new four stages. Preserve acquired rewards
  // without paying an already earned stage twice during the policy upgrade.
  for(const reward of rewardPlan(links.length,cfg)){
   const previouslyEarned=legacy.some(r=>Number(r.milestone)===legacyMilestones[reward.milestone-1]);
   await c.execute('INSERT IGNORE INTO referral_rewards_v2 VALUES(?,?,?,?,?,?,?,?)',[guild,inviter.minecraft_uuid,'inviter',reward.milestone,previouslyEarned?0:reward.keys,0,reward.alliance?1:0,Date.now()]);
  }
 }
 /** Cumulative server-authoritative counters; guild row lock serializes join, qualification and grants. */
 async sync(guild:string,profiles:{uuid:string;activeSeconds:number;firstSeen:number}[]){return this.atomic(async c=>{
  const event=await this.locked(c,guild),cfg=referralConfig.parse(json(event.config));
  for(const p of profiles){
   await c.execute('INSERT INTO referral_playtime VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE active_seconds=GREATEST(active_seconds,VALUES(active_seconds)),first_seen_ms=LEAST(first_seen_ms,VALUES(first_seen_ms))',[guild,p.uuid,p.activeSeconds,p.firstSeen]);
   const [users]=await c.query<Account[]>("SELECT discord_id,minecraft_uuid,DATE_FORMAT(minecraft_linked_at,'%Y-%m-%dT%H:%i:%sZ') AS minecraft_linked_at FROM users WHERE minecraft_uuid=? AND discord_id IS NOT NULL AND minecraft_linked_at IS NOT NULL AND merged_into IS NULL",[p.uuid]);
   const user=users[0];if(!user)continue;
   const [members]=await c.query<Member[]>('SELECT * FROM referral_members WHERE guild_id=? AND invitee_id=?',[guild,user.discord_id]);
   const member=members[0];if(member?.inviter_id){
    const [inviters]=await c.query<Account[]>("SELECT discord_id,minecraft_uuid,DATE_FORMAT(minecraft_linked_at,'%Y-%m-%dT%H:%i:%sZ') AS minecraft_linked_at FROM users WHERE discord_id=? AND minecraft_linked_at IS NOT NULL AND merged_into IS NULL",[member.inviter_id]);
    const [clock]=await c.query<RowDataPacket[]>('SELECT active_seconds,first_seen_ms FROM referral_playtime WHERE guild_id=? AND uuid=?',[guild,p.uuid]);
    const seconds=Number(clock[0]!.active_seconds);
    if(referralEligible(member,user,inviters[0],seconds,Number(clock[0]!.first_seen_ms),{...cfg,seconds:3600})){
     await c.execute('INSERT IGNORE INTO referral_identities VALUES(?,?,?)',[guild,user.discord_id,p.uuid]);
     const [bound]=await c.query<RowDataPacket[]>('SELECT uuid FROM referral_identities WHERE guild_id=? AND discord_id=?',[guild,user.discord_id]);
     if(bound[0]?.uuid===p.uuid){
      if(!member.qualified_uuid&&seconds>=cfg.seconds)await c.execute('UPDATE referral_members SET qualified_uuid=?,qualified_at_ms=? WHERE guild_id=? AND invitee_id=? AND qualified_uuid IS NULL',[p.uuid,Date.now(),guild,user.discord_id]);
      // Invitee rewards depend only on their own playtime, not the group size.
      for(let i=0;i<inviteeHours.length;i++)if(seconds>=inviteeHours[i]!*3600)
       await c.execute('INSERT IGNORE INTO referral_rewards_v2 VALUES(?,?,?,?,?,?,?,?)',[guild,p.uuid,'invitee',i+1,0,i===3?1:0,0,Date.now()]);
     }
    }
   }
   // Reconcile both paths: a late-linked inviter and all previously qualified invitees.
   if(cfg.enabled){await this.rewards(c,guild,user.discord_id,cfg);if(member?.inviter_id)await this.rewards(c,guild,member.inviter_id,cfg);}
  }
  const players=[];
  for(const p of profiles){
   const [r]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(vote_keys),0) AS keysTotal,COALESCE(MAX(alliance),0) AS alliance FROM referral_rewards WHERE guild_id=? AND uuid=?',[guild,p.uuid]);
   const [v2]=await c.query<RowDataPacket[]>('SELECT role,milestone,vote_keys,pulsar_keys,alliance FROM referral_rewards_v2 WHERE guild_id=? AND uuid=? ORDER BY milestone',[guild,p.uuid]);
   players.push({uuid:p.uuid,keysTotal:Number(r[0]!.keysTotal)+v2.reduce((n,r)=>n+Number(r.vote_keys),0),
    alliance:!!r[0]!.alliance||v2.some(r=>!!r.alliance),pulsarTotal:v2.reduce((n,r)=>n+Number(r.pulsar_keys),0),
    inviteeTiers:v2.filter(r=>r.role==='invitee').map(r=>Number(r.milestone))});
  }
  return {campaignId:event.id,enabled:cfg.enabled,requiredSeconds:cfg.seconds,players};
 });}
 async status(guild:string,discord:string){
  const event=await this.campaign(guild),cfg=referralConfig.parse(json(event.config));
  const [count]=await this.db.query<RowDataPacket[]>('SELECT COUNT(*) AS n,SUM(qualified_uuid IS NOT NULL) AS qualified FROM referral_members WHERE guild_id=? AND inviter_id=?',[guild,discord]);
  const [own]=await this.db.query<RowDataPacket[]>('SELECT m.inviter_id,m.qualified_uuid,p.active_seconds FROM referral_members m LEFT JOIN users u ON u.discord_id=m.invitee_id AND u.merged_into IS NULL LEFT JOIN referral_playtime p ON p.guild_id=m.guild_id AND p.uuid=u.minecraft_uuid WHERE m.guild_id=? AND m.invitee_id=?',[guild,discord]);
  return {cfg,invited:Number(count[0]!.n),qualified:Number(count[0]!.qualified??0),own:own[0]??null};
 }
}
