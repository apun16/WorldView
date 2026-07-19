// Prompts for generating the interior photospheres that no free photo source
// covers: market, home and school. Composed from a per-destination scene and
// per-subregion cultural detail, so 22 subregions x 3 destinations comes from
// 25 entries rather than 66 hand-written strings.
//
// Deliberately dependency-free so `scripts/panorama-prompts.mjs` can import it
// directly rather than parsing it.
//
// These target a purpose-built equirectangular generator (Skybox AI, PanoPulse
// and similar). General image models leave a visible seam where the left and
// right edges meet, which is glaring once the image is wrapped on a sphere.

export type GeneratedDestination = "market" | "home" | "school";

export const GENERATED_DESTINATIONS: GeneratedDestination[] = [
  "market",
  "home",
  "school",
];

const SCENE: Record<GeneratedDestination, string> = {
  market:
    "a busy local street market at ground level, stalls on all sides, awnings overhead, crates and baskets, shoppers browsing",
  home:
    "the inside of an ordinary family home, a lived-in main room, everyday furniture, cooking things, personal belongings on shelves, daylight through a window",
  school:
    "an ordinary primary school classroom, desks facing a blackboard, children's work pinned on the walls, satchels and books, light from windows",
};

type Flavour = {
  /** Culture and architecture. Must suit a home and a classroom as well as a
   *  market — anything stall-shaped or shop-shaped belongs in `stalls`. */
  build: string;
  /** Market-only setting: stalls, awnings, signage. */
  stalls?: string;
  /** Produce and wares. Market only — a classroom full of jackfruit is wrong. */
  goods: string;
  light: string;
};

const FLAVOUR: Record<string, Flavour> = {
  "southern-asia": {
    build: "South Asian, Sri Lankan and South Indian, corrugated roofing, painted concrete, patterned floor tile",
    goods: "jackfruit, coconut, chillies, curry leaves, rice sacks",
    light: "bright humid tropical daylight",
  },
  "eastern-asia": {
    build: "East Asian, Japanese and Chinese, tiled floors, sliding paper partitions, low wooden furniture",
    stalls: "narrow covered arcade, vertical signage, hanging lanterns",
    goods: "leafy greens, noodles, seafood, tofu",
    light: "clean cool daylight",
  },
  "south-eastern-asia": {
    build: "Southeast Asian, Thai Vietnamese Indonesian, painted concrete, louvred windows, tin roofing",
    stalls: "open-air shophouse fronts, plastic stools, tarpaulin awnings",
    goods: "tropical fruit, lemongrass, fish, fresh herbs",
    light: "warm hazy tropical light",
  },
  "western-asia": {
    build: "Middle Eastern, Levantine and Gulf, stone arches, patterned tilework, carpets and brasswork",
    goods: "dates, olives, nuts, spices in open sacks",
    light: "warm low sunlight",
  },
  "central-asia": {
    build: "Central Asian, Uzbek and Kazakh, brick and painted plaster, patterned textiles",
    goods: "melons, flatbread, dried fruit, tea",
    light: "dry bright light",
  },
  "northern-africa": {
    build: "North African, Moroccan and Egyptian, whitewashed and ochre walls, zellige tile, carved wood",
    goods: "mint, olives, dates, tagine pots, spice cones",
    light: "strong warm sunlight",
  },
  "western-africa": {
    build: "West African, Nigerian Ghanaian Senegalese, corrugated roofing, bright printed fabric, painted concrete",
    goods: "yams, plantain, peppers, groundnuts",
    light: "intense equatorial sun",
  },
  "eastern-africa": {
    build: "East African, Kenyan Ethiopian Tanzanian, painted concrete and timber, kanga textiles",
    goods: "maize, beans, coffee, bananas",
    light: "high bright light",
  },
  "middle-africa": {
    build: "Central African, Congolese and Cameroonian, timber and tin roofing",
    goods: "cassava, plantain, palm oil, river fish",
    light: "dense green filtered light",
  },
  "southern-africa": {
    build: "Southern African, South African and Namibian, brick and corrugated iron",
    goods: "maize meal, dried goods, mixed produce",
    light: "dry clear light",
  },
  "south-america": {
    build: "South American, Peruvian Bolivian Brazilian, Andean and colonial, painted stucco, woven textiles",
    goods: "potatoes, maize, peppers, coca leaf, tropical fruit",
    light: "high clear light",
  },
  "central-america": {
    build: "Central American, Guatemalan and Costa Rican, colourful stucco, clay tile, woven cloth",
    goods: "maize, beans, chillies, tropical fruit",
    light: "bright tropical light",
  },
  caribbean: {
    build: "Caribbean, Jamaican and Cuban, pastel timber, louvred shutters, tin roofing",
    goods: "tropical fruit, fish, allspice, sugar cane",
    light: "vivid sunlight",
  },
  "north-america": {
    build: "North American, painted timber, brick, drywall interiors",
    stalls: "canopied stalls, trestle tables",
    goods: "mixed seasonal produce, baked goods",
    light: "temperate daylight",
  },
  "western-europe": {
    build: "Western European, French and Dutch, stone and painted timber, shuttered windows",
    goods: "bread, cheese, cut flowers, charcuterie",
    light: "soft overcast light",
  },
  "southern-europe": {
    build: "Southern European, Italian Spanish Greek, terracotta, stucco, shuttered facades",
    goods: "olives, tomatoes, citrus, fish, cured meat",
    light: "warm Mediterranean sun",
  },
  "northern-europe": {
    build: "Northern European, Scandinavian, pale timber, glass, minimal fittings",
    goods: "berries, rye bread, cured fish",
    light: "low soft northern light",
  },
  "central-europe": {
    build: "Central European, German and Polish, brick, timber framing, painted plaster",
    goods: "sausage, bread, root vegetables, preserves",
    light: "cool grey light",
  },
  "southeast-europe": {
    build: "Southeast European, Balkan and Turkish, stone and plaster, arched windows",
    goods: "peppers, cheese, honey, dried herbs",
    light: "warm light",
  },
  "eastern-europe": {
    build: "Eastern European, Ukrainian and Russian, concrete, painted plaster, patterned rugs",
    goods: "root vegetables, preserves, bread, pickles",
    light: "cold pale light",
  },
  melanesia: {
    build: "Melanesian, Papua New Guinean and Fijian, timber, palm thatch, woven walls",
    goods: "taro, fish, tropical fruit",
    light: "humid bright light",
  },
  "australia-and-new-zealand": {
    build: "Australian and New Zealander, steel, glass, painted weatherboard",
    goods: "mixed seasonal produce, coffee",
    light: "clear strong light",
  },
};

const SUFFIX =
  "360 degree equirectangular panorama, seamless horizontal wrap, photorealistic, natural lighting, no people looking at camera, no text, no watermark, camera at eye level 1.6 metres";

export function panoramaPrompt(
  subregion: string,
  destination: string
): string | null {
  const scene = SCENE[destination as GeneratedDestination];
  const flavour = FLAVOUR[subregion];
  if (!scene || !flavour) return null;

  // Goods only belong in a market; a classroom described with produce comes
  // back looking like a greengrocer with desks in it.
  const detail =
    destination === "market"
      ? [flavour.build, flavour.stalls, flavour.goods].filter(Boolean).join(", ")
      : flavour.build;

  return `${scene}, ${detail}, ${flavour.light}, ${SUFFIX}`;
}

export function allSubregions(): string[] {
  return Object.keys(FLAVOUR).sort();
}
