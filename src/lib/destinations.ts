export type DestinationId = "market" | "home" | "school" | "nature" | "street";

export type Destination = {
  id: DestinationId;
  label: string;
  glyph: string;
  /** One line on what the user picks up by going here. */
  tagline: string;
};

export const DESTINATIONS: Destination[] = [
  {
    id: "market",
    label: "The market",
    glyph: "◎",
    tagline: "Haggling, ingredients, and the words for what things cost.",
  },
  {
    id: "home",
    label: "A home",
    glyph: "⌂",
    tagline: "Family, food, and how people greet each other indoors.",
  },
  {
    id: "school",
    label: "A school",
    glyph: "✎",
    tagline: "How children are taught, and the language they learn in.",
  },
  {
    id: "nature",
    label: "Nature walk",
    glyph: "❧",
    tagline: "Land, weather, and the seasons that shape the year here.",
  },
  {
    id: "street",
    label: "The street",
    glyph: "⌁",
    tagline: "Neighbours, small talk, and the rhythm of an ordinary day.",
  },
];

// A journey is a walk between places, so a single stop is not a route. Four is
// where an itinerary starts feeling like a chore rather than an afternoon.
export const MIN_STOPS = 3;
export const MAX_STOPS = 4;

const byId = new Map(DESTINATIONS.map((d) => [d.id, d]));

export function isDestinationId(id: string): id is DestinationId {
  return byId.has(id as DestinationId);
}

export function findDestination(id: DestinationId): Destination | null {
  return byId.get(id) ?? null;
}
