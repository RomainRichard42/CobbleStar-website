export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  starsPrice: number;
  itemId: string;
  itemCount: number;
  testOnly: boolean;
};

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

export const shopCatalog = products.map(({ itemId: _itemId, ...product }) => product);

export const gameShopCatalog = products.map((product) => ({ ...product }));

export function findShopProduct(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
