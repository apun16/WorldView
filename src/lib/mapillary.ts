import type { CountryInfo } from "@/lib/country-index";
import { mapillaryHit } from "@/lib/walk/mapillary-coverage";

// Mapillary is the only worldwide source of street-level 360 imagery we can
// use: crowd-sourced, CC BY-SA, and genuinely present in Nairobi, Lima and
// Rabat, where Poly Haven and Wikimedia have nothing.
//
// Coverage is harvested ahead of time by scripts/harvest-mapillary.mjs, so this
// makes at most ONE request — fetching a known image by id — and none at all
// for countries already known to have nothing. A blind bbox search costs up to
// 33 requests and usually finds the same image anyway.
//
// Server-only: the token must never reach the browser, and image bytes are
// proxied by /api/street-photo rather than linked. The CDN's CORS policy is
// undocumented, and a cross-origin image cannot become a WebGL texture.

const GRAPH = "https://graph.mapillary.com";

export type StreetPhoto = {
  id: string;
  url: string;
  /** CC BY-SA requires the photographer be credited. */
  creator: string | null;
};

export function mapillaryConfigured(): boolean {
  return Boolean(process.env.MAPILLARY_TOKEN);
}

/** Whether this country has known coverage — no network call. */
export function hasStreetPhoto(iso2: string): boolean {
  return mapillaryConfigured() && mapillaryHit(iso2) !== null;
}

/**
 * Resolves the harvested image for a country to a current CDN url. Returns null
 * when the token is missing, the country has no coverage, or the request fails
 * — every failure is non-fatal and the walk falls back to its static tiers.
 */
export async function findStreetPhoto(
  country: CountryInfo
): Promise<StreetPhoto | null> {
  const token = process.env.MAPILLARY_TOKEN;
  if (!token) return null;

  const hit = mapillaryHit(country.iso2);
  if (!hit) return null;

  try {
    const response = await fetch(`${GRAPH}/${hit.id}?fields=thumb_2048_url`, {
      headers: { Authorization: `OAuth ${token}` },
      // Coverage changes over months; the CDN url may rot sooner, so this is
      // deliberately shorter than the harvest interval.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { thumb_2048_url?: string };
    if (!data.thumb_2048_url) return null;

    return { id: hit.id, url: data.thumb_2048_url, creator: hit.creator };
  } catch {
    return null;
  }
}
