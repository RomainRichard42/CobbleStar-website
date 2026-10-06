import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Collection,Events,ChannelType,PermissionFlagsBits as P} from 'discord.js';

test('Ticket workflow with mocked Discord: permissions, claim, moves, members, confirmation and archives',async()=>{
  Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),DISCORD_BOT_TOKEN:'fake-never-connect',DISCORD_GUILD_ID:'123456789012345670'});
  const [{startDiscordBot},{pool}]=await Promise.all([import('../dist/discord-bot.js'),import('../dist/db.js')]);
  const ids={guild:'123456789012345670',bot:'123456789012345671',staff:'123456789012345672',admin:'123456789012345673',owner:'123456789012345674',helper:'123456789012345675',outsider:'123456789012345676',added:'123456789012345677',archive:'123456789012345678'};
  const cfg={staffRole:ids.staff,adminRole:ids.admin,channels:{tickets:ids.archive},categories:{reception:'123456789012345680',en_cours:'123456789012345681',bug:'123456789012345682',a_fermer:'123456789012345683'},watched:[],retentionDays:30,privateEnabled:false};
  const tickets=new Map(),channels=new Map(),posts=[],registered=[];let serial=1000;
  const role=(id,admin=false)=>({id,permissions:{has:p=>admin&&p===P.Administrator},tags:id===ids.bot?{botId:ids.bot}:{}});
  const roles=new Collection([[ids.guild,role(ids.guild)],[ids.staff,role(ids.staff)],[ids.admin,role(ids.admin,true)],[ids.bot,role(ids.bot)]]);
  const guild={id:ids.guild,commands:{fetch:async()=>new Collection()},roles:{cache:roles,fetch:async()=>roles},invites:{fetch:async()=>new Collection()}};
  guild.members={fetch:async id=>({id,user:{id,bot:id===ids.bot},permissions:{has:p=>id===ids.admin&&p===P.Administrator},roles:{cache:new Collection(id===ids.helper?[[ids.staff,roles.get(ids.staff)]]:[])}}),fetchMe:async()=>({id:ids.bot})};
  function channel(id,topic=null) {
    const messages=new Collection();
    const c={id,type:ChannelType.GuildText,guildId:ids.guild,guild,topic,parent:null,overwrites:[],
      permissionsFor:r=>({has:()=>[ids.staff,ids.admin,ids.bot].includes(r.id)}),
      permissionOverwrites:{cache:new Collection(),set:async values=>{c.overwrites=values;}},
      setParent:async parent=>{c.parent=parent;},
      messages:{fetch:async({before}={})=>before?new Collection():new Collection(messages)},
      send:async payload=>{
        const m={id:String(++serial),content:payload.content??'',author:{id:ids.bot,tag:'Bot'},createdTimestamp:serial,createdAt:new Date(serial),attachments:new Collection(),delete:async()=>{messages.delete(m.id);}};
        messages.set(m.id,m);posts.push({channel:id,payload});return m;
      },delete:async()=>{channels.delete(id);}};
    channels.set(id,c);return c;
  }
  channel(ids.archive);
  for(const id of Object.values(cfg.categories))channels.set(id,{id,type:ChannelType.GuildCategory});
  guild.channels={fetch:async id=>channels.get(id),create:async options=>{const c=channel(String(++serial),options.topic);c.overwrites=options.permissionOverwrites;c.parent=options.parent;return c;}};
  const client=new EventEmitter();client.user={id:ids.bot};client.guilds={fetch:async()=>guild};client.channels={fetch:async id=>channels.get(id)};
  client.rest={post:async(_,{body})=>registered.push(body),patch:async()=>{}};
  client.login=async()=>{queueMicrotask(()=>client.emit(Events.ClientReady));return 'fake';};client.destroy=()=>{};client.isReady=()=>true;
  async function query(sql,args=[]) {
    if(sql.includes('GET_LOCK'))return[[{acquired:1,ok:1}],[]];
    if(sql.includes('IS_USED_LOCK'))return[[{owned:1}],[]];
    if(sql.includes('FROM discord_settings'))return[[{settings:cfg}],[]];
    if(sql.includes('FROM discord_invites'))return[[],[]];
    if(sql.includes('FROM discord_tickets')) {
      let all=[...tickets.values()];
      if(sql.includes('channel_id=?'))all=all.filter(t=>t.channel_id===args[1]);
      else if(sql.includes('owner_id=?'))all=all.filter(t=>t.owner_id===args[1]&&t.status!=='closed');
      else if(sql.includes('WHERE id=?'))all=all.filter(t=>t.id===args[0]);
      else if(sql.includes("status='closed'"))all=[];
      return[all.map(t=>({...t})),[]];
    }
    return[[],[]];
  }
  async function execute(sql,a=[]) {
    if(sql.startsWith('INSERT INTO discord_tickets'))tickets.set(a[0],{id:a[0],guild_id:a[1],owner_id:a[2],channel_id:a[3],subject:a[4],description:a[5],members:a[6],status:'reception',claimed_by:null,close_token:null,close_expires:null,close_reason:null});
    if(sql.startsWith('UPDATE discord_tickets')) {
      let t;
      if(sql.includes('claimed_by=?')) {t=tickets.get(a[1]);if(t.claimed_by&&t.claimed_by!==a[0])return[{affectedRows:0},[]];t.claimed_by=a[0];}
      else if(sql.includes("SET status='closing'")){t=tickets.get(a[1]);if(['closed','closing'].includes(t.status))return[{affectedRows:0},[]];t.status='closing';t.close_reason=a[0];}
      else if(sql.includes("SET status='closed'")){t=tickets.get(a[1]);t.status='closed';t.archive_message=a[0];t.close_token=null;}
      else if(sql.includes('SET status=?')){t=tickets.get(a[1]);t.status=a[0];}
      else if(sql.includes('SET members=?')){t=tickets.get(a[1]);t.members=a[0];}
      else if(sql.includes('SET close_token=?')){t=tickets.get(a[2]);t.close_token=a[0];t.close_expires=new Date(Date.now()+86400000);t.close_reason=a[1];}
      else if(sql.includes('SET close_token=NULL')){t=tickets.get(a[0]);t.close_token=null;t.close_expires=null;}
    }
    return[{affectedRows:1},[]];
  }
  const saved={query:pool.query,execute:pool.execute,getConnection:pool.getConnection};
  pool.query=query;pool.execute=execute;pool.getConnection=async()=>({query,execute,on:()=>{},release:()=>{},beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{}});
  async function dispatch(user,channelId,sub,values={},kind='command') {
    let done;const result=new Promise(resolve=>done=resolve);
    const interaction={guildId:ids.guild,channelId,user:{id:user},commandName:'ticket',customId:values.customId??'cs:ticket:form',
      isChatInputCommand:()=>kind==='command',isModalSubmit:()=>kind==='modal',isButton:()=>kind==='button',isRepliable:()=>true,
      options:{getSubcommand:()=>sub,getString:key=>values[key],getUser:key=>({id:values[key]})},
      fields:{getTextInputValue:key=>values[key]},message:{edit:async()=>{}},
      deferReply:async()=>{interaction.deferred=true;},editReply:async value=>done(value),reply:async value=>done(value),showModal:async value=>done(value)};
    client.emit(Events.InteractionCreate,interaction);
    const timer=setTimeout(()=>done({content:'TEST TIMEOUT'}),3000);
    try{return await result;}finally{clearTimeout(timer);await new Promise(r=>setImmediate(r));}
  }
  let stop;
  try {
    stop=await startDiscordBot({info:()=>{},warn:()=>{}},()=>client);
    assert.deepEqual(registered.map(c=>c.name),['csconfig','ticket','evenement']);
    const created=await dispatch(ids.owner,'public',null,{subject:'Bug',description:'Une demande'},'modal');
    assert.match(created.content,/Ton ticket/);assert.equal(tickets.size,1);
    const t=[...tickets.values()][0],c=channels.get(t.channel_id);
    assert.ok(c.overwrites.find(o=>o.id===ids.guild).deny.includes(P.ViewChannel));
    assert.match((await dispatch(ids.outsider,c.id,'claim')).content,/staff/);assert.equal(t.claimed_by,null);
    assert.match((await dispatch(ids.helper,c.id,'claim')).content,/effectuée/);assert.equal(t.claimed_by,ids.helper);assert.equal(c.parent,cfg.categories.en_cours);
    await dispatch(ids.helper,c.id,'ajouter',{joueur:ids.added});assert.ok(JSON.parse(t.members).includes(ids.added));
    await dispatch(ids.helper,c.id,'deplacer',{etape:'bug'});assert.equal(c.parent,cfg.categories.bug);assert.ok(c.overwrites.some(o=>o.id===ids.added));
    await dispatch(ids.helper,c.id,'fermer',{resume:'Corrigé'});assert.ok(t.close_token);const token=t.close_token;
    assert.match((await dispatch(ids.outsider,c.id,null,{customId:`cs:close:${token}`},'button')).content,/demandeur/);assert.notEqual(t.status,'closed');
    await dispatch(ids.owner,c.id,null,{customId:`cs:keep:${token}`},'button');assert.equal(t.close_token,null);assert.equal(t.status,'en_cours');
    await dispatch(ids.helper,c.id,'fermer',{resume:'Résolu et vérifié'});
    const closed=await dispatch(ids.owner,c.id,null,{customId:`cs:close:${t.close_token}`},'button');assert.match(closed.content,/enregistré/);assert.equal(t.status,'closed');
    assert.ok(posts.some(p=>p.channel===ids.archive&&p.payload.files?.[0].name.endsWith('.txt')));
    assert.ok(posts.some(p=>p.channel===ids.archive&&p.payload.content.includes('Résolu et vérifié')));
    assert.ok(c.overwrites.find(o=>o.id===ids.owner).deny.includes(P.SendMessages));assert.ok(channels.has(c.id));
    const archive=channels.get(ids.archive),permissions=archive.permissionsFor;
    archive.permissionsFor=()=>({has:()=>true});
    assert.match((await dispatch(ids.owner,'public',null,{subject:'Autre',description:'Demande suivante'},'modal')).content,/visible par un rôle/);
    assert.equal(tickets.size,1);archive.permissionsFor=permissions;
    await dispatch(ids.owner,'public',null,{subject:'Autre',description:'Demande suivante'},'modal');
    const t2=[...tickets.values()][1],c2=channels.get(t2.channel_id);
    assert.match((await dispatch(ids.outsider,c2.id,'forcer-fermeture',{resume:'forgé'})).content,/staff/);
    const send=archive.send;archive.send=async()=>{throw new Error('Discord unavailable');};
    assert.match((await dispatch(ids.helper,c2.id,'forcer-fermeture',{resume:'Résolu'})).content,/non terminée/);
    assert.notEqual(t2.status,'closed');assert.ok(channels.has(c2.id));
    assert.ok(c2.overwrites.find(o=>o.id===ids.owner).allow.includes(P.SendMessages));
    archive.send=send;
    await dispatch(ids.helper,c2.id,'forcer-fermeture',{resume:'Résolu'});assert.equal(t2.status,'closed');
  }finally{await stop?.();Object.assign(pool,saved);await pool.end();}
});
