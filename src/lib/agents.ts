import type { CountryFeature } from "@/lib/geo-types";
import { getNamePoolForCountry, type CountryLike, type NamePool } from "@/lib/guide-names";

export type Gender = "female" | "male";

export type Agent = {
  id: string;
  name: string;
  gender: Gender;
  iso2: string;
  lat: number;
  lng: number;
  /** Multiplier on the base pin size, shrunk for small countries so the pin
   * never renders wider than the landmass it's standing on. 1 = full size. */
  sizeScale: number;
};

const GUIDE_COUNT = 2;
const MAX_SAMPLE_ATTEMPTS = 30;

// agent-marker.ts's MARKER_SIZE, in three-globe world units — the diameter a
// sizeScale of 1 renders at. three-globe's sphere has radius 100, so 1 degree
// of arc is (2π·100)/360 world units.
const FULL_MARKER_WORLD_SIZE = 7.2;
const WORLD_UNITS_PER_DEGREE = (2 * Math.PI * 100) / 360;
// A pin should span at most this fraction of the landmass it stands on.
const FIT_FRACTION = 0.35;
// A floor in world units, not in sizeScale — clamping the *scale* to a floor
// would still oversize genuinely tiny nations (Jamaica, Gambia...), since
// their whole landmass is smaller than even a "small" fraction of the full
// pin. Clamping the final rendered size instead lets those keep shrinking.
const MIN_MARKER_WORLD_SIZE = 1.15;

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
  gender: Gender;
  iso2: string;
};

/**
 * Guide identities for a country. Only positions need the country's geometry,
 * so pages that just name a guide (the journey planner) can skip loading the
 * geojson entirely — CountryLike (iso2/continent/languages) is enough to also
 * pick a culturally-matched name pool.
 *
 * Shares the seeded sequence used by getCountryAgents — names are drawn before
 * any position sampling — so both functions always agree.
 */
export function getAgentIdentities(country: CountryLike): AgentIdentity[] {
  const { iso2 } = country;
  const rand = mulberry32(hashString(iso2));
  const count = agentCount();
  const pool = getNamePoolForCountry(country);
  return pickNames(count, rand, pool).map(({ name, gender }, i) => ({
    id: `${iso2}-${i}`,
    name,
    gender,
    iso2,
  }));
}

export function findAgentIdentity(
  country: CountryLike,
  agentId: string
): AgentIdentity | null {
  return getAgentIdentities(country).find((a) => a.id === agentId) ?? null;
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
  const count = agentCount();
  const pool = getNamePoolForCountry(country.properties);
  const names = pickNames(count, rand, pool);
  const agents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    const point = samplePointInCountry(country, rand);
    const desiredWorldSize = point.extentDeg * WORLD_UNITS_PER_DEGREE * FIT_FRACTION;
    const worldSize = clamp(desiredWorldSize, MIN_MARKER_WORLD_SIZE, FULL_MARKER_WORLD_SIZE);
    const sizeScale = worldSize / FULL_MARKER_WORLD_SIZE;
    agents.push({
      id: `${iso2}-${i}`,
      name: names[i].name,
      gender: names[i].gender,
      iso2,
      lat: point.lat,
      lng: point.lng,
      sizeScale,
    });
  }

  cache.set(iso2, agents);
  return agents;
}

function agentCount(): number {
  return GUIDE_COUNT;
}

/** Produces one female and one male guide name, drawn from a culturally-matched pool. */
function pickNames(
  count: number,
  rand: () => number,
  pool: NamePool
): Array<{ name: string; gender: Gender }> {
  if (count <= 0) return [];
  const female = pool.female[Math.floor(rand() * pool.female.length)];
  const male = pool.male[Math.floor(rand() * pool.male.length)];
  return [
    { name: female, gender: "female" as const },
    { name: male, gender: "male" as const },
  ].slice(0, count);
}

/**
 * Rejection-samples a point inside the country's landmass.
 *
 * Sampling happens within a single randomly-chosen ring's own bounding box,
 * weighted by ring size, rather than one box around the whole country. A
 * combined box is useless for countries that straddle the antimeridian (Fiji's
 * would span the globe) and wasteful for scattered archipelagos.
 *
 * Also returns extentDeg — the chosen ring's narrower bounding-box dimension —
 * so the caller can shrink the marker to fit whichever landmass (island,
 * mainland...) the point actually landed on, rather than the country overall.
 */
function samplePointInCountry(
  country: CountryFeature,
  rand: () => number
): { lat: number; lng: number; extentDeg: number } {
  const rings = exteriorRings(country.geometry);
  if (rings.length === 0) {
    return { lat: country.properties.lat, lng: country.properties.lng, extentDeg: 1 };
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
      return { lat, lng, extentDeg: ringExtentDeg(boxes[index]) };
    }
  }

  // Last resort for slivers too thin to hit: the largest ring's first vertex,
  // which is guaranteed to be on that country's coastline.
  const largest = weights.indexOf(Math.max(...weights));
  const [lng, lat] = rings[largest][0];
  return { lat, lng, extentDeg: ringExtentDeg(boxes[largest]) };
}

function ringExtentDeg([minLng, minLat, maxLng, maxLat]: [number, number, number, number]): number {
  return Math.min(maxLng - minLng, maxLat - minLat);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
