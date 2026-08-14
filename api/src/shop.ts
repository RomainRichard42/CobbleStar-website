import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

<<<<<<< HEAD
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const visualSchema = z.object({
  accent: color.default("#9B8CFF"),
  badge: z.string().max(24).default(""),
  previewTexture: z.string().max(160).default(""),
});
const productSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
  name: z.string().min(1).max(80),
  description: z.string().max(240),
  starsPrice: z.number().int().positive().max(10_000_000),
  itemId: z.string().regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/),
  itemCount: z.number().int().min(1).max(64),
  testOnly: z.boolean().default(false),
  category: z.enum(["keys", "cosmetics", "collection", "companions", "boosters", "ranks"]),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  visual: visualSchema.default({ accent: "#9B8CFF", badge: "", previewTexture: "" }),
});
const themeSchema = z.object({
  window: color, header: color, panel: color, panelInner: color, border: color,
  accent: color, cyan: color, pink: color, title: color, text: color, label: color, muted: color,
});
const catalogSchema = z.object({
  version: z.literal(1),
  theme: themeSchema,
  products: z.array(productSchema).max(250),
}).superRefine((catalog, context) => {
  const ids = new Set<string>();
  catalog.products.forEach((product, index) => {
    if (ids.has(product.id)) context.addIssue({
      code: "custom", path: ["products", index, "id"], message: `Identifiant dupliqué : ${product.id}`,
    });
    ids.add(product.id);
  });
});
=======
const products: ShopProduct[] = [
  {
    id: "key_nova",
    name: "Clé Nova",
    description: "Ouvre une caisse Nova au spawn CobbleStar.",
    starsPrice: 350,
    itemId: "cobblestar_planets:key_nova",
    itemCount: 1,
    testOnly: false,
  },
  {
    id: "key_pulsar",
    name: "Clé Pulsar",
    description: "Ouvre une caisse Pulsar et son catalogue exclusif.",
    starsPrice: 650,
    itemId: "cobblestar_planets:key_pulsar",
    itemCount: 1,
    testOnly: false,
  },
  {
    id: "key_quasar",
    name: "Clé Quasar",
    description: "La clé premium des récompenses Quasar.",
    starsPrice: 950,
    itemId: "cobblestar_planets:key_quasar",
    itemCount: 1,
    testOnly: false,
  },
  {
    id: "delivery_test",
    name: "Éclat Stellaire de test",
    description: "Un éclat d’améthyste utilisé pour vérifier la livraison site → serveur.",
    starsPrice: 1,
    itemId: "minecraft:amethyst_shard",
    itemCount: 1,
    testOnly: true,
  },
];
>>>>>>> 847eed66aff04d92bcc6b161a1a14adc8736b24e

export type ShopProduct = z.infer<typeof productSchema>;
export type ShopTheme = z.infer<typeof themeSchema>;
type ShopCatalogFile = z.infer<typeof catalogSchema>;

const catalogPath = process.env.SHOP_CATALOG_PATH
  ?? fileURLToPath(new URL("../shop.catalog.json", import.meta.url));
let cached: ShopCatalogFile | null = null;
let cachedMtime = -1;

export function readShopCatalog(): ShopCatalogFile {
  const mtime = statSync(catalogPath).mtimeMs;
  if (cached && cachedMtime === mtime) return cached;
  const parsed = catalogSchema.parse(JSON.parse(readFileSync(catalogPath, "utf8")));
  cached = parsed;
  cachedMtime = mtime;
  return parsed;
}

export function getGameShopCatalog() {
  return readShopCatalog().products.map((product) => ({ ...product, visual: { ...product.visual } }));
}

export function getShopTheme() {
  return { ...readShopCatalog().theme };
}

export const gameShopCatalog = products.map((product) => ({ ...product }));

export function findShopProduct(id: string) {
  return readShopCatalog().products.find((product) => product.id === id) ?? null;
}
