import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { AttachmentBuilder, ChannelType, PermissionFlagsBits as P, type Guild, type GuildMember, type MessageCreateOptions } from "discord.js";
import { z } from "zod";

const assets=new URL("../discord-welcome-assets/",import.meta.url);
const configuration=new URL("../discord-welcome.json",import.meta.url);
const settingsSchema=z.object({enabled:z.boolean(),channelId:z.string().regex(/^\d{15,24}$/)}).strict();
const welcomeSchema=z.object({guildId:z.string().regex(/^\d{15,24}$/),memberId:z.string().regex(/^\d{15,24}$/),name:z.string().min(1).max(160),avatar:z.string().max(1000),joinedAt:z.number().int().positive(),channelId:z.string().regex(/^\d{15,24}$/)}).strict();
export type WelcomeCard=z.infer<typeof welcomeSchema>;
export const welcomeEventId=(guild:string,member:string,joinedAt:number)=>`welcome:${guild}:${member}:${joinedAt}`;
export const welcomeNonce=(id:string)=>createHash("sha256").update(id).digest("hex").slice(0,24);
export const welcomeName=(name:string)=>Array.from(name.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,"").trim()).slice(0,64).join("")||"Dresseur";
const escape=(text:string)=>text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");

export function safeAvatarUrl(value:string){
  try{const u=new URL(value);return u.protocol==="https:"&&u.hostname==="cdn.discordapp.com"&&!u.port&&!u.username&&!u.password&&/^\/(?:avatars\/\d+\/|guilds\/\d+\/users\/\d+\/avatars\/|embed\/avatars\/)[a-zA-Z0-9_.-]+\.(?:png|webp|jpg)$/.test(u.pathname)?u.href:null;}catch{return null;}
}
export async function avatarBytes(value:string,fetcher:typeof fetch=fetch):Promise<Buffer|undefined>{
  const url=safeAvatarUrl(value);if(!url)return;
  try{
    const response=await fetcher(url,{redirect:"error",signal:AbortSignal.timeout(5000)});
    if(!response.ok||!response.headers.get("content-type")?.startsWith("image/")||Number(response.headers.get("content-length"))>1024*1024||!response.body){await response.body?.cancel();return;}
    const chunks:Uint8Array[]=[];let total=0;const reader=response.body.getReader();
    try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1024*1024){await reader.cancel();return;}chunks.push(value);}}finally{reader.releaseLock();}
    return Buffer.concat(chunks);
  }catch{return;}
}
async function lettering(value:string,maxWidth:number,height:number,color:string){
  return sharp({text:{text:`<span foreground="${color}">${escape(value)}</span>`,font:"Barlow Condensed ExtraBold",fontfile:fileURLToPath(new URL("display.ttf",assets)),width:maxWidth,height,wrap:"none",align:"centre",rgba:true}}).png().toBuffer({resolveWithObject:true});
}
export async function renderWelcomeCard(name:string,avatar?:Buffer):Promise<Buffer>{
  const clean=welcomeName(name),size=216;
  let portrait:Buffer;
  try{if(!avatar)throw new Error("No avatar");portrait=await sharp(avatar,{limitInputPixels:4_000_000,animated:false}).rotate().resize(size,size,{fit:"cover"}).png().toBuffer();}
  catch{
    const clyde=await sharp(fileURLToPath(new URL("discord.png",assets))).resize(135,135).png().toBuffer();
    portrait=await sharp({create:{width:size,height:size,channels:4,background:"#5865f2"}}).composite([{input:clyde,gravity:"centre"}]).png().toBuffer();
  }
  const mask=Buffer.from(`<svg width="${size}" height="${size}"><circle cx="108" cy="108" r="108" fill="white"/></svg>`);
  portrait=await sharp(portrait).composite([{input:mask,blend:"dest-in"}]).png().toBuffer();
  const ring=Buffer.from('<svg width="232" height="232"><circle cx="116" cy="116" r="115" fill="#ffd17d"/><circle cx="116" cy="116" r="110" fill="#30213e"/></svg>');
  const heading=await lettering("BIENVENUE",410,38,"#ffd17d"),username=await lettering(clean,440,53,"#fff1d9"),subtitle=await lettering("sur CobbleStar",360,27,"#e5d4ee");
  return sharp(await readFile(new URL("background.png",assets))).composite([
    {input:ring,left:164,top:107},{input:portrait,left:172,top:115},
    {input:heading.data,left:Math.round(280-heading.info.width/2),top:49},
    {input:username.data,left:Math.round(280-username.info.width/2),top:361},
    {input:subtitle.data,left:Math.round(280-subtitle.info.width/2),top:425},
  ]).png().toBuffer();
}
export function welcomeMessage(card:WelcomeCard,png:Buffer):MessageCreateOptions{
  return {content:`Bienvenue sur **CobbleStar**, <@${card.memberId}> !`,allowedMentions:{parse:[],users:[card.memberId],roles:[],repliedUser:false},
    files:[new AttachmentBuilder(png,{name:"bienvenue-cobblestar.png",description:`Bienvenue sur CobbleStar, ${welcomeName(card.name)} !`})],
    nonce:welcomeNonce(welcomeEventId(card.guildId,card.memberId,card.joinedAt)),enforceNonce:true};
}
type WelcomeDatabase={execute:(query:string,values:string[])=>Promise<unknown>};
export class DiscordWelcome {
  constructor(private readonly guild:()=>Promise<Guild>,private readonly db:WelcomeDatabase,
    private readonly readSettings=async()=>settingsSchema.parse(JSON.parse(await readFile(configuration,"utf8"))),
    private readonly image=async(card:WelcomeCard)=>renderWelcomeCard(card.name,await avatarBytes(card.avatar))){}
  private async destination(guild:Guild,channelId:string){
    const channel=await guild.channels.fetch(channelId);if(!channel||channel.type!==ChannelType.GuildText)throw new Error("Welcome text channel unavailable");
    const me=await guild.members.fetchMe();if(!channel.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.AttachFiles]))throw new Error("Welcome permissions missing");
    return channel;
  }
  async check(){
    const cfg=await this.readSettings();if(!cfg.enabled)return {enabled:false};
    await this.destination(await this.guild(),cfg.channelId);
    const preview=await renderWelcomeCard("Dresseur");
    return {enabled:true,channelId:cfg.channelId,cardBytes:preview.length};
  }
  async enqueue(member:GuildMember){
    if(member.user.bot)return;const cfg=await this.readSettings();if(!cfg.enabled)return;
    const card:WelcomeCard={guildId:member.guild.id,memberId:member.id,name:welcomeName(member.displayName),avatar:member.displayAvatarURL({extension:"png",size:256,forceStatic:true}),joinedAt:member.joinedTimestamp??Date.now(),channelId:cfg.channelId};
    await this.db.execute("INSERT IGNORE INTO discord_event_outbox (id,kind,body) VALUES (?,?,?)",[welcomeEventId(card.guildId,card.memberId,card.joinedAt),"welcome",JSON.stringify(card)]);
  }
  async deliver(body:unknown){
    const card=welcomeSchema.parse(typeof body==="string"?JSON.parse(body):body),cfg=await this.readSettings();
    if(!cfg.enabled||Date.now()-card.joinedAt>24*60*60*1000)return;
    const guild=await this.guild();if(guild.id!==card.guildId)throw new Error("Welcome guild mismatch");
    const channel=await this.destination(guild,cfg.channelId);
    // A delayed retry must not welcome a member who has already left.
    try{await guild.members.fetch(card.memberId);}catch(error){if((error as {code?:number}).code===10007)return;throw error;}
    await channel.send(welcomeMessage(card,await this.image(card)));
  }
}
