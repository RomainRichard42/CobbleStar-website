import { escapeMarkdown, type MessageCreateOptions } from "discord.js";
import { gtsListingSchema, type GtsListing } from "./discord-policy.js";

const safe = (value: string, max: number) => escapeMarkdown(value.replace(/[\r\n\u0000-\u001f]/g, " ").replace(/@/g, "@\u200b").replace(/</g, "‹").replace(/>/g, "›")).slice(0, max);

/** Legacy game versions send only text. Parse the known template, never expose raw IDs. */
export function gtsMessage(body: {text: string; listing?: GtsListing}, emojis: {pokemon?: string; item?: string} = {}): MessageCreateOptions {
  const parsed = gtsListingSchema.safeParse(body.listing);
  let listing = parsed.success ? parsed.data : undefined;
  let legacy = false;
  if (!listing) {
    const match = body.text.match(/(?:^|\n)Nouvelle annonce GTS · ([^\r\n]+) [×x](\d+)\r?\nVendeur : ([^\r\n]+) · Prix total : (\d+) Cobblecoins(?:\r?\n|$)/);
    if (match) {
      const result = gtsListingSchema.safeParse({mode:"sale", type:"item", name:match[1], count:Number(match[2]), seller:match[3], price:Number(match[4])});
      if (result.success) { listing = result.data; legacy = true; }
    }
  }
  if (!listing) return {embeds:[{title:"📣 GTS · Nouvelle annonce", description:"Consulte le GTS en jeu pour voir cette annonce.", color:0x6584eb}], allowedMentions:{parse:[]}};
  const auction = listing.mode === "auction";
  const icon = legacy ? "🏷️" : listing.type === "pokemon" ? (emojis.pokemon || "🔴") : (emojis.item || "📦");
  const fields = [
    {name:"👤 Vendeur", value:safe(listing.seller, 200), inline:true},
    {name:auction ? "💰 Mise de départ" : "💰 Prix total", value:`**${new Intl.NumberFormat("fr-FR").format(listing.price)} Cobblecoins**`, inline:true},
  ];
  if (listing.endsAt) {
    const seconds = Math.floor(listing.endsAt / 1000);
    fields.push({name:auction ? "⏳ Fin de l’enchère" : "⏳ Fin de la vente", value:`<t:${seconds}:F>\n<t:${seconds}:R>`, inline:false});
  }
  return {embeds:[{
    title:auction ? "🔨 GTS · Nouvelle enchère" : "💰 GTS · Nouvelle vente",
    description:`${icon} **${safe(listing.name, 600)}** ×${listing.count}`,
    color:auction ? 0xe6ad45 : 0x6584eb,
    fields, footer:{text:"CobbleStar • Retrouve cette annonce dans le GTS en jeu"},
  }], allowedMentions:{parse:[]}};
}
