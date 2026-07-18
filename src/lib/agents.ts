import type { CountryFeature } from "@/lib/geo-types";
import { COUNTRY_AREAS_KM2 } from "@/lib/country-areas";

export type Agent = {
  id: string;
  name: string;
  iso2: string;
  lat: number;
  lng: number;
};

const FALLBACK_AGENTS = 3;
const MAX_SAMPLE_ATTEMPTS = 30;

// Agent count by land area (km²), ascending. Explicit bands rather than a
// normalized curve so the small end stays genuinely small: without this, the
// median country drifts to the middle of the range and every country looks
// roughly the same.
const AREA_BANDS: Array<{ maxAreaKm2: number; agents: number }> = [
  { maxAreaKm2: 100_000, agents: 2 },
  { maxAreaKm2: 500_000, agents: 3 },
  { maxAreaKm2: 2_000_000, agents: 4 },
  { maxAreaKm2: 5_000_000, agents: 5 },
  { maxAreaKm2: 10_000_000, agents: 6 },
  { maxAreaKm2: Infinity, agents: 7 },
];

// Placeholder names until real character data exists. Deliberately not matched
// to any country — that comes with the character system.
const NAME_POOL = [
  "Amara", "Rafael", "Yuki", "Nadia", "Tomas", "Leila", "Kwame", "Ingrid",
  "Hassan", "Mei", "Sofia", "Dmitri", "Ayesha", "Lucas", "Priya", "Emeka",
  "Elena", "Jun", "Fatima", "Andres", "Sanne", "Omar", "Keiko", "Marisol",
  "Nikolai", "Zara", "Mateo", "Anouk", "Ravi", "Isolde",
];

/** An agent positioned for rendering, lifted above its country's polygon cap. */
export type AgentMarker = Agent & { altitude: number };

const cache = new Map<string, Agent[]>();
const markerCache = new Map<string, AgentMarker[]>();

/**
 * Markers for a country at a given altitude, cached by both. three-globe keys
 * its objects on datum identity, so returning stable references keeps it from
 * tearing down and rebuilding every marker on unrelated hover changes.
 */
export function getCountryAgentMarkers(
  country: CountryFeature,
  altitude: number
): AgentMarker[] {
  const key = `${country.properties.iso2}:${altitude}`;
  const cached = markerCache.get(key);
  if (cached) return cached;

  const markers = getCountryAgents(country).map((agent) => ({ ...agent, altitude }));
  markerCache.set(key, markers);
  return markers;
}

/** Who a country's guides are, independent of where they stand. */
export type AgentIdentity = {
  id: string;
  name: string;
  iso2: string;
};

/**
 * Guide identities for a country. Only positions need the country's geometry,
 * so pages that just name a guide (the journey planner) can skip loading the
 * geojson entirely.
 *
 * Shares the seeded sequence used by getCountryAgents — names are drawn before
 * any position sampling — so both functions always agree.
 */
export function getAgentIdentities(iso2: string): AgentIdentity[] {
  const rand = mulberry32(hashString(iso2));
  const count = agentCount(iso2);
  return pickNames(count, rand).map((name, i) => ({
    id: `${iso2}-${i}`,
    name,
    iso2,
  }));
}

export function findAgentIdentity(
  iso2: string,
  agentId: string
): AgentIdentity | null {
  return getAgentIdentities(iso2).find((a) => a.id === agentId) ?? null;
}

/**
 * Deterministic agents for a country: the same iso2 always yields the same
 * count, names, and positions, so pins do not reshuffle between renders.
 */
export function getCountryAgents(country: CountryFeature): Agent[] {
  const { iso2 } = country.properties;
  const cached = cache.get(iso2);
  if (cached) return cached;

  const rand = mulberry32(hashString(iso2));
  const count = agentCount(iso2);
  const names = pickNames(count, rand);
  const agents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    const point = samplePointInCountry(country, rand);
    agents.push({
      id: `${iso2}-${i}`,
      name: names[i],
      iso2,
      lat: point.lat,
      lng: point.lng,
    });
  }

  cache.set(iso2, agents);
  return agents;
}

function agentCount(iso2: string): number {
  const area = COUNTRY_AREAS_KM2[iso2];
  if (!area) return FALLBACK_AGENTS;
  return AREA_BANDS.find((band) => area <= band.maxAreaKm2)!.agents;
}

/** Draws `count` distinct names via partial Fisher-Yates, so no country
 *  ends up with two guides sharing a name. */
function pickNames(count: number, rand: () => number): string[] {
  const pool = [...NAME_POOL];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(rand() * pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

/**
 * Rejection-samples a point inside the country's landmass.
 *
 * Sampling happens within a single randomly-chosen ring's own bounding box,
 * weighted by ring size, rather than one box around the whole country. A
 * combined box is useless for countries that straddle the antimeridian (Fiji's
 * would span the globe) and wasteful for scattered archipelagos.
 */
function samplePointInCountry(
  country: CountryFeature,
  rand: () => number
): { lat: number; lng: number } {
  const rings = exteriorRings(country.geometry);
  if (rings.length === 0) {
    return { lat: country.properties.lat, lng: country.properties.lng };
  }

  const boxes = rings.map(boundingBox);
  const weights = boxes.map(([w, s, e, n]) => Math.max((e - w) * (n - s), 1e-6));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  for (let attempt = 0; attempt < MAX_SAMPLE_ATTEMPTS; attempt++) {
    const index = weightedIndex(weights, totalWeight, rand());
    const [minLng, minLat, maxLng, maxLat] = boxes[index];
    const lng = minLng + rand() * (maxLng - minLng);
    const lat = minLat + rand() * (maxLat - minLat);
    if (pointInRing(lng, lat, rings[index])) {
      return { lat, lng };
    }
  }

  // Last resort for slivers too thin to hit: the largest ring's first vertex,
  // which is guaranteed to be on that country's coastline.
  const largest = weights.indexOf(Math.max(...weights));
  const [lng, lat] = rings[largest][0];
  return { lat, lng };
}

function weightedIndex(
  weights: number[],
  totalWeight: number,
  sample: number
): number {
  let threshold = sample * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return i;
  }
  return weights.length - 1;
}

type Ring = number[][];

function exteriorRings(geometry: GeoJSON.Geometry): Ring[] {
  if (geometry.type === "Polygon") {
    // First ring is the exterior; any others are holes, which we ignore.
    return geometry.coordinates.slice(0, 1) as Ring[];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0]) as Ring[];
  }
  return [];
}

function boundingBox(ring: Ring): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

// Ray casting: counts edge crossings to the left of the point.
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const straddles = yi > lat !== yj > lat;
    if (straddles && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
