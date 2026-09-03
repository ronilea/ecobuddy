export type OutfitParams = {
  clothing: string;
  top: string;
  clothesColor?: string;
  hairColor?: string;
  hatColor?: string;
  clothingGraphic?: string;
  accessories?: string;
};

export type Outfit = {
  id: string;
  name: string;
  cost: number;
  params: OutfitParams;
};

// DiceBear 9.x — lock eyes/mouth so seed doesn't pick scary random faces
const BASE = {
  seed: "ecobuddy",
  eyes: "happy",
  eyebrows: "defaultNatural",
  skinColor: "ffdbb4",
  backgroundColor: "b7e4c7",
};

export const OUTFITS: Outfit[] = [
  {
    id: "default",
    name: "Eco Hoodie",
    cost: 0,
    params: {
      clothing: "hoodie",
      top: "bob",
      clothesColor: "52b788",
      hairColor: "4a312c",
    },
  },
  {
    id: "coolHat",
    name: "Cool Hat",
    cost: 1,
    params: {
      clothing: "hoodie",
      top: "hat",
      clothesColor: "52b788",
      hatColor: "5199e4",
    },
  },
  {
    id: "ranger",
    name: "Forest Ranger",
    cost: 5,
    params: {
      clothing: "overall",
      top: "hat",
      clothesColor: "6b8e23",
      hatColor: "8b4513",
      accessories: "sunglasses",
    },
  },
  {
    id: "labCoat",
    name: "Lab Researcher",
    cost: 10,
    params: {
      clothing: "blazerAndShirt",
      top: "bun",
      clothesColor: "e6e6e6",
      hairColor: "2c1b18",
      accessories: "round",
    },
  },
  {
    id: "recycler",
    name: "Eco Warrior",
    cost: 15,
    params: {
      clothing: "graphicShirt",
      top: "curly",
      clothesColor: "2d6a4f",
      hairColor: "4a312c",
      accessories: "prescription02",
    },
  },
  {
    id: "solarScout",
    name: "Sun Explorer",
    cost: 20,
    params: {
      clothing: "shirtCrewNeck",
      top: "hat",
      clothesColor: "ffb703",
      hatColor: "ffd60a",
      accessories: "sunglasses",
    },
  },
];

export function outfitById(id: string): Outfit {
  return OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}

export function dicebearUrl(
  outfit: Outfit,
  mouth: "smile" | "default" | "serious" | "concerned" = "smile"
): string {
  const params = new URLSearchParams({
    ...BASE,
    mouth,
    clothing: outfit.params.clothing,
    top: outfit.params.top,
    clothesColor: outfit.params.clothesColor ?? "52b788",
    accessoriesProbability: "0",
  });

  if (outfit.params.hairColor) {
    params.set("hairColor", outfit.params.hairColor);
  }
  if (outfit.params.hatColor) {
    params.set("hatColor", outfit.params.hatColor);
  }
  if (outfit.params.clothingGraphic) {
    params.set("clothingGraphic", outfit.params.clothingGraphic);
  }
  if (outfit.params.accessories) {
    params.set("accessories", outfit.params.accessories);
    params.set("accessoriesProbability", "100");
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}
