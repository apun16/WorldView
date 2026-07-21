import type { CountryInfo } from "@/lib/country-index";
import type { DestinationId } from "@/lib/destinations";
import { LOCATION_PHRASE_BY_STOP } from "@/lib/walk-variables";
import {
  resolveSupportedLanguage,
  type SupportedLanguage,
} from "@/lib/supported-languages";

export type StayNear = DestinationId | "capital" | "attraction";

export type StayListing = {
  id: string;
  name: string;
  area: string;
  distanceMeters: number | null;
  rating: number | null;
  stars: number | null;
  ratingCount: number | null;
  thumbnail: string | null;
  deeplink: string;
  hint: string;
};

type Stay22Result = {
  id?: string;
  name?: string;
  url?: string;
  location?: {
    address?: string;
    distanceInMeters?: number;
  };
  rating?: {
    value?: number;
    hotelStars?: number;
    count?: number;
  };
  media?: { thumbnail?: string };
};

type Stay22Response = {
  results?: Stay22Result[];
};

const API_BASE = "https://api.stay22.com/v2/accommodations";

/** Build a Stay22 search address seeded by culture, not a generic hotel query. */
export function staySearchAddress(
  country: CountryInfo,
  near: StayNear,
  languageDisplayName?: string | null
): string {
  const capital = country.capital;
  const name = country.name;

  if (near === "attraction") {
    const attraction = attractionFor(country.iso2, languageDisplayName);
    if (attraction) return `${attraction}, ${name}`;
  }

  if (near === "capital") return `${capital}, ${name}`;

  const phrase = LOCATION_PHRASE_BY_STOP[near as DestinationId];
  if (phrase) {
    // e.g. "the spice market near Brasília, Brazil"
    return `${phrase.replace(/^the /i, "")} near ${capital}, ${name}`;
  }

  return `${capital}, ${name}`;
}

function attractionFor(
  iso2: string,
  languageDisplayName?: string | null
): string | null {
  if (!languageDisplayName) return null;
  const lang: SupportedLanguage | null =
    resolveSupportedLanguage(languageDisplayName);
  if (lang?.attraction && lang.attractionIso2 === iso2) return lang.attraction;
  return null;
}

function withAid(url: string, aid: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("aid", aid);
    return u.toString();
  } catch {
    return url;
  }
}

function sanitize(
  raw: Stay22Result,
  aid: string
): StayListing | null {
  if (!raw.id || !raw.name || !raw.url) return null;

  const rating = raw.rating?.value ?? null;
  const stars = raw.rating?.hotelStars ?? null;
  const distanceMeters = raw.location?.distanceInMeters ?? null;
  const parts: string[] = [];
  if (stars) parts.push(`${stars}★`);
  if (rating != null) parts.push(`rated ${rating.toFixed(1)}`);
  if (distanceMeters != null && distanceMeters < 50_000) {
    const km = distanceMeters / 1000;
    parts.push(km < 1 ? `${Math.round(distanceMeters)} m away` : `${km.toFixed(1)} km away`);
  }

  return {
    id: raw.id,
    name: raw.name,
    area: raw.location?.address?.split(",").slice(0, 2).join(",").trim() ?? "",
    distanceMeters,
    rating,
    stars,
    ratingCount: raw.rating?.count ?? null,
    thumbnail: raw.media?.thumbnail ?? null,
    deeplink: withAid(raw.url, aid),
    hint: parts.join(" · ") || "available tonight",
  };
}

/**
 * Live Stay22 inventory. Never persist results — Stay22 forbids cold storage.
 */
export async function searchStays(input: {
  country: CountryInfo;
  near?: StayNear;
  language?: string | null;
  limit?: number;
  /** Override address entirely when provided. */
  address?: string;
}): Promise<StayListing[]> {
  const aid = process.env.NEXT_PUBLIC_STAY22_AID || "worldview";
  const apiKey = process.env.STAY22_API_KEY;
  const near = input.near ?? "capital";
  const address =
    input.address ??
    staySearchAddress(input.country, near, input.language);

  const url = new URL(API_BASE);
  url.searchParams.set("address", address);
  url.searchParams.set("lat", String(input.country.capitalLat || input.country.lat));
  url.searchParams.set("lng", String(input.country.capitalLng || input.country.lng));
  url.searchParams.set("pageSize", String(Math.min(input.limit ?? 6, 20)));

  const headers: HeadersInit = { Accept: "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Stay22 ${response.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as Stay22Response;
  const listings: StayListing[] = [];
  for (const raw of body.results ?? []) {
    const item = sanitize(raw, aid);
    if (item) listings.push(item);
  }

  const ranked = rankStaysForStory(listings, near);
  return ranked.slice(0, input.limit ?? 6);
}

/** Prefer closer rooms when the search was seeded by a cultural stop. */
export function rankStaysForStory(
  listings: StayListing[],
  near: StayNear
): StayListing[] {
  const preferClose = near !== "capital";
  return [...listings].sort((a, b) => {
    const da = a.distanceMeters;
    const db = b.distanceMeters;
    if (preferClose) {
      if (da != null && db != null) return da - db;
      if (da != null) return -1;
      if (db != null) return 1;
    }
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    if (da != null && db != null) return da - db;
    return 0;
  });
}
