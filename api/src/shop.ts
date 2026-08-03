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

export function findShopProduct(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
