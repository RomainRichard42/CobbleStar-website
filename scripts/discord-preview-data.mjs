// Synthetic fixtures for the loopback-only preview. Never imported by the production API.
const now=Date.now(),iso=new Date(now).toISOString();
export const discordPreview={generatedAt:iso,guildId:'100000000000000000',canWrite:false,version:'a'.repeat(64),liveError:null,
  live:{name:'CobbleStar · Démonstration',memberCount:128,icon:'/cobblestar-logo.png',botName:'Bot de démonstration',botId:'100000000000000001',latency:42,
    roles:[{id:'100000000000000002',name:'Guide',color:'#df67a0',managed:false,syncSafe:false,manualSafe:false},{id:'100000000000000003',name:'Recrue',color:'#66ccdf',managed:false,syncSafe:true,manualSafe:false},{id:'100000000000000004',name:'Explorateur',color:'#6bcba4',managed:false,syncSafe:true,manualSafe:true}],
    channels:[{id:'100000000000000005',name:'gts',type:0,parentId:null,canSend:true,canManage:true},{id:'100000000000000006',name:'mini-jeux',type:0,parentId:null,canSend:true,canManage:true}]},
  settings:{roleSyncEnabled:true,statusEnabled:true,roleMappings:[{source:'grade',key:'recrue',role:'100000000000000003'}],channels:{gts:'100000000000000005',minigame:'100000000000000006'},watched:[],retentionDays:30,gameServerId:'DEMO'},
  minecraft:{status:'🟢 Serveur : En ligne (exemple)',players:'👥 Joueurs : 12 / 200',receivedAt:now,stale:false},tickets:[{status:'reception',total:3},{status:'en_cours',total:2},{status:'closed',total:18}],
  outbox:[{kind:'gts',pending:2,retrying:0,delivered:85},{kind:'tickets',pending:0,retrying:0,delivered:23},{kind:'members',pending:0,retrying:0,delivered:12},{kind:'minigame',pending:1,retrying:1,delivered:8}],
  daily:Array.from({length:30},(_,i)=>({day:new Date(now-(29-i)*86400000).toISOString().slice(0,10),total:(i*7)%19+2,delivered:(i*7)%19})),
  recentTickets:[{id:'demo-ticket',channelId:'100000000000000005',subject:'Exemple · Liaison du compte Minecraft',status:'en_cours',claimedBy:'100000000000000007',createdAt:iso}],
  events:[{id:'demo-event',title:'Exemple · Soirée exploration',status:'scheduled',channelId:'100000000000000006',messageId:null,startsAt:now+86400000,participants:8}],audit:[],
};
export const discordMembersPreview={members:[{id:'100000000000000008',name:'Dresseur Démo',username:'exemple',avatar:'/cobblestar-logo.png',bot:false,joinedAt:now-86400000,roles:['100000000000000003'],manageable:true}],next:null,truncated:false};
