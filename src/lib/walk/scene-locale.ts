import type { CountryInfo } from "@/lib/country-index";
import type { DestinationId } from "@/lib/destinations";
import { mapillaryHit } from "@/lib/walk/mapillary-coverage";

// Photosphere selection driven by where the journey actually is. Without this
// every country renders the same generic photo, and the environment stops
// carrying any information about the place — which is most of the point.

export type ClimateZone =
  | "tropical"
  | "arid"
  | "temperate"
  | "continental"
  | "polar";

export type Region =
  | "africa"
  | "asia"
  | "europe"
  | "americas"
  | "oceania";

/**
 * Countries whose defining landscape is desert or semi-desert. Latitude alone
 * cannot find these — the Sahara and the Arabian peninsula sit in the same
 * bands as rainforest, so Morocco and Malaysia would otherwise collide.
 */
const ARID_ISO2 = new Set([
  "MA", "DZ", "TN", "LY", "EG", "SD", "TD", "NE", "ML", "MR", "EH",
  "SA", "AE", "OM", "YE", "QA", "BH", "KW", "JO", "IQ", "SY", "IL", "PS",
  "IR", "AF", "PK", "TM", "UZ", "KZ", "MN",
  "NA", "BW", "DJ", "ER", "SO",
  "AU",
]);

// Latitude bands, in degrees from the equator. These are tuned so the big
// countries land where a person would expect: France (46°) reads oceanic rather
// than continental, and Russia's centroid (60°) reads continental rather than
// polar. Only genuinely boreal places — Iceland, Finland, Greenland — go polar.
const TROPICAL_MAX = 23.5;
const TEMPERATE_MAX = 50;
const CONTINENTAL_MAX = 63;

export function climateZone(country: CountryInfo): ClimateZone {
  if (ARID_ISO2.has(country.iso2)) return "arid";

  const latitude = Math.abs(country.lat);
  if (latitude < TROPICAL_MAX) return "tropical";
  if (latitude < TEMPERATE_MAX) return "temperate";
  if (latitude < CONTINENTAL_MAX) return "continental";
  return "polar";
}

export function region(country: CountryInfo): Region {
  switch (country.continent) {
    case "Africa":
      return "africa";
    case "Asia":
      return "asia";
    case "Europe":
      return "europe";
    case "Oceania":
      return "oceania";
    case "North America":
    case "South America":
      return "americas";
    default:
      // Antarctica and the open-ocean entry have no meaningful built
      // environment; the generic tier is the honest answer for them.
      return "europe";
  }
}

/**
 * Photosphere paths to try for a stop, best first.
 *
 * The middle tiers differ by destination because what makes a place look like
 * itself differs. A forest is set by climate — a rainforest is a rainforest in
 * Brazil or Sri Lanka. A market is set by culture, so it goes subregion first:
 * "Asia" is far too coarse a bucket to put Colombo and Shanghai in, and doing
 * so is exactly how a Sri Lankan street ends up rendered as a Chinese one.
 */
export function photospherePaths(
  country: CountryInfo,
  destination: DestinationId
): string[] {
  const iso2 = country.iso2.toLowerCase();
  const climate = climateZone(country);
  const area = region(country);
  const sub = country.subregion;

  const built = [
    ...(sub ? [`_subregion/${sub}/${destination}.jpg`] : []),
    `_region/${area}/${destination}.jpg`,
  ];

  // Mapillary is real imagery of this actual country, so it outranks every
  // regional approximation. It sits below a hand-placed country file, which is
  // curated and therefore better still.
  //
  // Gated on harvested coverage so the 63 countries with no 360 imagery never
  // issue a request that is already known to fail.
  const live =
    destination === "street" && mapillaryHit(country.iso2)
      ? [`/api/street-photo?iso2=${iso2.toUpperCase()}`]
      : [];

  const middle =
    destination === "nature"
      ? [`_climate/${climate}/nature.jpg`, ...built]
      : [...built, `_climate/${climate}/${destination}.jpg`];

  const staticPaths = [
    `${iso2}/${destination}.jpg`,
    ...middle,
    `_default/${destination}.jpg`,
  ].map((path) => `/scenes/xr/${path}`);

  // Country file first (curated), then live Mapillary, then the approximations.
  return [staticPaths[0], ...live, ...staticPaths.slice(1)];
}
