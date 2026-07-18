import {
  DESTINATIONS,
  MAX_STOPS,
  MIN_STOPS,
  type DestinationId,
} from "@/lib/destinations";

// The walk's route travels in the URL, keeping the property the journey route
// already has: the URL is the whole state. That makes a walk shareable,
// refreshable, and survivable across taking a headset off — and it means QA can
// jump straight to any country/route combination by typing an address.

const VALID_IDS = new Set<string>(DESTINATIONS.map((d) => d.id));

// Bounds the work done on a hand-edited query string before it is rejected.
const MAX_RAW_LENGTH = 200;

export function serializeStops(stops: DestinationId[]): string {
  return stops.join(",");
}

/**
 * Parses `?stops=market,home,street`, returning null for anything that is not a
 * legal route. Order is significant and preserved — it is the walking order.
 */
export function parseStopsParam(raw: string | null | undefined): DestinationId[] | null {
  if (!raw || raw.length > MAX_RAW_LENGTH) return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < MIN_STOPS || parts.length > MAX_STOPS) return null;
  if (new Set(parts).size !== parts.length) return null;
  if (!parts.every((part) => VALID_IDS.has(part))) return null;

  return parts as DestinationId[];
}

export function walkHref(
  iso2: string,
  guideId: string,
  stops: DestinationId[],
  language?: string | null
): string {
  const params = new URLSearchParams({
    guide: guideId,
    stops: serializeStops(stops),
  });
  if (language) params.set("lang", language);
  return `/explore/${iso2.toUpperCase()}/walk?${params.toString()}`;
}
