import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,Collection,PermissionFlagsBits as P} from 'discord.js';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
const [{eventTime,eventDraft,parisDate,reminderWindows},{DiscordCommunityEvents,eventCard,participantPage,communityEventCommand},{settingsSchema},{pool}]=await Promise.all([
  import('../dist/discord-community-events.js'),import('../dist/discord-community-events-bot.js'),import('../dist/discord-policy.js'),import('../dist/db.js')]);
after(()=>pool.end());
const now=Date.parse('2026-10-06T12:00:00Z');
test('Paris dates ignore the host timezone and validate calendar, horizon and DST folds/gaps',()=>{
  assert.equal(eventTime('07/10/2026 20:30',now),Date.parse('2026-10-07T18:30Z'));
  assert.equal(eventTime('2026-10-07T20:30+02:00',now),eventTime('07/10/2026 20:30',now));
  assert.equal(parisDate(Date.parse('2026-10-07T18:30Z')),'07/10/2026 20:30');
  assert.throws(()=>eventTime('25/10/2026 02:30',now),/ambiguë/);
  assert.equal(eventTime('2026-10-25T02:30+02:00',now),Date.parse('2026-10-25T00:30Z'));
  assert.equal(eventTime('2026-10-25T02:30+01:00',now),Date.parse('2026-10-25T01:30Z'));
  assert.throws(()=>eventTime('28/03/2027 02:30',now),/inexistante/);
  for(const date of ['31/02/2027 12:00','2027-02-31T12:00Z','07/10/2026 24:30','01/10/2026 12:00','01/10/2028 12:00','2026-10-07T12:00+14:01','2026-10-07T12:00+02:65','soon'])assert.throws(()=>eventTime(date,now));
});
test('Form validation bounds sizes, capacity and duration, no inferred command or external event',()=>{
  const input={title:'Tournoi',details:'Rendez-vous au spawn',kind:'tournoi',date:'07/10/2026 20:30',duration:'60',capacity:'32'};
  const d=eventDraft(input,now);assert.equal(d.endsAt-d.startsAt,3600000);assert.equal(d.capacity,32);
  assert.equal(eventDraft({...input,capacity:'0'},now).capacity,0);
  for(const patch of [{kind:'op'},{title:''},{details:''},{title:'t'.repeat(101)},{details:'d'.repeat(1001)},{duration:'0'},{duration:'1441'},{duration:'60.0'},{capacity:'-1'},{capacity:'501'}])assert.throws(()=>eventDraft({...input,...patch},now));
});
function fixture() {
  const id='11111111-1111-4111-8111-111111111111';
  const ids={guild:'123456789012345670',channel:'123456789012345671',staff:'123456789012345672',user:'123456789012345673',bot:'123456789012345674',other:'123456789012345675'};
  const e={id,guild_id:ids.guild,creator_id:ids.staff,channel_id:ids.channel,message_id:'123456789012345676',title:'Raid communautaire',details:'RDV au spawn',kind:'raid',
    starts_at_ms:Date.now()+2*3600000,ends_at_ms:Date.now()+3*3600000,created_at_ms:Date.now(),capacity:1,status:'scheduled',revision:1,published_revision:1,schedule_version:1};
  const people=[],calls=[],notices=[];
  let permitted=true,memberPresent=true,dmError;
  const member=id=>({id,user:{id,bot:id===ids.bot},permissions:{has:p=>false},roles:{cache:new Collection(id===ids.staff?[[ids.staff,{}]]:[])},
    send:async payload=>{if(dmError)throw dmError;calls.push(['dm',id,payload]);}});
  const c={id:ids.channel,type:ChannelType.GuildText,permissionsFor:m=>({has:()=>m.id===ids.bot||permitted}),
    send:async payload=>{calls.push(['public',payload]);return {id:e.message_id};},messages:{fetch:async()=>({id:e.message_id,author:{id:ids.bot},edit:async payload=>calls.push(['edit',payload])})}};
  const g={id:ids.guild,channels:{fetch:async id=>id===ids.channel?c:null},members:{fetch:async id=>{if(!memberPresent)throw Object.assign(Error(),{code:10007});return member(id);},fetchMe:async()=>member(ids.bot)}};
  const store={get:async(guild,id)=>guild===ids.guild&&id===e.id?{...e}:undefined,list:async()=>[{...e}],participants:async()=>people.map(p=>({...p})),
    create:async(...args)=>{calls.push(['create',args]);return e;},edit:async()=>calls.push(['modify']),cancel:async()=>{calls.push(['cancel']);e.status='cancelled';},
    join:async(guild,id,user)=>{calls.push(['join',user]);let p=people.find(p=>p.user_id===user);if(!p){p={event_id:id,user_id:user,status:people.length?'waiting':'confirmed',position:people.length+1,dm_reminders:0};people.push(p);}return {status:p.status,already:false};},
    leave:async(guild,id,user)=>{calls.push(['leave',user]);people.splice(people.findIndex(p=>p.user_id===user),1);},toggleDm:async()=>true,
    published:async()=>{},publishFailed:async()=>{},housekeeping:async()=>{},dirty:async()=>[],due:async()=>notices.splice(0),
    noticeState:async(n,state)=>calls.push(['notice',n.kind,state])};
  const sync=new DiscordCommunityEvents(async()=>g,()=>ids.bot,{warn:()=>{}},store);
  const s=settingsSchema.parse({staffRole:ids.staff});
  function interaction(user=ids.user,action='join',kind='button',values={}) {
    let result;
    const i={id:'123456789012345699',guildId:ids.guild,channelId:ids.channel,user:{id:user},commandName:'evenement',customId:`cs:event:${action}:${e.id}`,
      message:{id:e.message_id},isChatInputCommand:()=>kind==='command',isModalSubmit:()=>kind==='modal',isButton:()=>kind==='button',
      options:{getSubcommand:()=>action,getString:key=>key==='id'?e.id:values[key],getBoolean:key=>values[key],getInteger:key=>values[key]},
      fields:{getTextInputValue:key=>values[key]},deferReply:async()=>{i.deferred=true;},editReply:async payload=>{result=payload;},
      showModal:async modal=>{result=modal.toJSON();},followUp:async()=>{}};
    return {i,result:()=>result};
  }
  return {e,ids,people,calls,notices,sync,s,interaction,setAccess:v=>permitted=v,setMember:v=>memberPresent=v,setDmError:v=>dmError=v};
}
test('Public announcement preserves Poké-server theme, controls and explicit opt-in, pages never truncate',()=>{
  const f=fixture(),people=Array.from({length:64},(_,n)=>({user_id:String(123456789012345670n+BigInt(n)),status:n<40?'confirmed':'waiting',position:n}));
  const card=eventCard(f.e,people,Date.now());assert.equal(card.components[0].components.length,4);assert.deepEqual(card.allowedMentions,{parse:[]});
  assert.match(card.embeds[0].toJSON().footer.text,/visible/);
  assert.equal(participantPage(f.e,people,1).embeds[0].toJSON().description.split('\n').length,25);
  assert.match(participantPage(f.e,people,3).embeds[0].toJSON().footer.text,/3\/3/);
  for(const status of ['running','finished','cancelled'])assert.ok(eventCard({...f.e,status},people).components[0].components[0].data.disabled);
  const cmd=communityEventCommand();assert.equal(cmd.name,'evenement');assert.equal(cmd.options.length,5);
});
test('Staff-only creation/modification/cancellation recheck authorization; player registration works',async()=>{
  const f=fixture();
  const player=f.interaction(f.ids.user,'creer','command',{type:'raid'});await assert.rejects(()=>f.sync.handle(player.i,f.s),/staff/);assert.equal(f.calls.length,0);
  const staff=f.interaction(f.ids.staff,'creer','command',{type:'raid'});await f.sync.handle(staff.i,f.s);
  assert.equal(staff.result().custom_id,'cs:event:create:raid');assert.equal(staff.result().components.length,5);
  const revoked=f.interaction(f.ids.user,'create','modal');revoked.i.customId='cs:event:create:raid';await assert.rejects(()=>f.sync.handle(revoked.i,f.s),/staff/);
  const join=f.interaction();await f.sync.handle(join.i,f.s);assert.match(join.result().content,/Tu es inscrit/);
  const second=f.interaction(f.ids.other);await f.sync.handle(second.i,f.s);assert.match(second.result().content,/liste d’attente/);
  assert.equal(f.people.length,2);assert.equal(f.calls.filter(c=>c[0]==='dm').length,0);
});
test('Foreign guilds, forged messages, bots and inaccessible events cannot mutate or leak registrations',async()=>{
  const f=fixture(),foreign=f.interaction();foreign.i.guildId='123456789012345698';await assert.rejects(()=>f.sync.handle(foreign.i,f.s),/serveur/);
  const forged=f.interaction();forged.i.message.id='fake';await assert.rejects(()=>f.sync.handle(forged.i,f.s),/annonce actuelle/);
  const bot=f.interaction(f.ids.bot);await assert.rejects(()=>f.sync.handle(bot.i,f.s),/joueurs/);
  f.setAccess(false);const hidden=f.interaction();await assert.rejects(()=>f.sync.handle(hidden.i,f.s),/accès/);assert.equal(f.people.length,0);
  const list=f.interaction(f.ids.user,'liste','command');await f.sync.handle(list.i,f.s);assert.match(list.result().content,/Aucun événement/);
});
test('Cancellation needs exact confirmation and a reason, full export is staff-only',async()=>{
  const f=fixture();f.people.push({user_id:f.ids.user,status:'confirmed',position:1});
  const exportPlayer=f.interaction(f.ids.user,'participants','command',{export:true});await assert.rejects(()=>f.sync.handle(exportPlayer.i,f.s),/staff/);
  const exportStaff=f.interaction(f.ids.staff,'participants','command',{export:true});await f.sync.handle(exportStaff.i,f.s);assert.ok(exportStaff.result().files[0].name.endsWith('.txt'));
  const cancel=f.interaction(f.ids.staff,'cancel','modal',{reason:'Report météo',confirm:'non'});await assert.rejects(()=>f.sync.handle(cancel.i,f.s),/ANNULER/);assert.equal(f.e.status,'scheduled');
  const confirmed=f.interaction(f.ids.staff,'cancel','modal',{reason:'Report météo',confirm:'ANNULER'});await f.sync.handle(confirmed.i,f.s);assert.equal(f.e.status,'cancelled');
});
test('Persistent reminders retry transient failures, ignore cancelled/expired/unsubscribed jobs, no mass pings',async()=>{
  const f=fixture(),notice=(patch={})=>({event_id:f.e.id,schedule_version:1,kind:'10m',user_id:'',expires_at_ms:Date.now()+100000,attempts:0,...patch});
  f.notices.push(notice());await f.sync.tick(f.s);const publicPost=f.calls.find(c=>c[0]==='public');assert.deepEqual(publicPost[1].allowedMentions,{parse:[]});
  assert.deepEqual(f.calls.find(c=>c[0]==='notice'),['notice','10m','sent']);f.calls.length=0;
  f.notices.push(notice({user_id:f.ids.user}));await f.sync.tick(f.s);assert.deepEqual(f.calls[0],['notice','10m','skipped']);
  f.people.push({user_id:f.ids.user,status:'confirmed',position:1,dm_reminders:1});f.calls.length=0;
  f.setDmError(Error('temporary'));f.notices.push(notice({user_id:f.ids.user}));await f.sync.tick(f.s);assert.deepEqual(f.calls[0],['notice','10m','pending']);
  f.setDmError(Object.assign(Error(),{code:50007}));f.calls.length=0;f.notices.push(notice({user_id:f.ids.user}));await f.sync.tick(f.s);assert.deepEqual(f.calls[0],['notice','10m','skipped']);
  f.calls.length=0;f.e.status='cancelled';f.notices.push(notice());await f.sync.tick(f.s);assert.deepEqual(f.calls[0],['notice','10m','skipped']);
});
test('Reminder windows are ordered; a late recovery must not send outdated 24h/1h reminders',()=>{
  const f=fixture(),w=reminderWindows(f.e);assert.deepEqual(w.map(v=>v.kind),['24h','1h','10m','start']);
  assert.equal(w[0].expires,w[1].at);assert.equal(w[1].expires,w[2].at);assert.equal(w[2].expires,w[3].at);
  assert.ok(w[3].expires<=f.e.ends_at_ms);
});
