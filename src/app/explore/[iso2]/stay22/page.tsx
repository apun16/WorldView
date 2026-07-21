import { notFound } from "next/navigation";
import { findCountry } from "@/lib/country-index";
import {
  findAgentIdentity,
  getAgentIdentities,
} from "@/lib/agents";
import { localTimeFromLongitude } from "@/lib/local-time";
import {
  isDestinationId,
  type DestinationId,
} from "@/lib/destinations";
import type { StayNear } from "@/lib/stay22";
import Stay22Experience from "@/components/stay/stay22-experience";

export default async function Stay22Page({
  params,
  searchParams,
}: {
  params: Promise<{ iso2: string }>;
  searchParams: Promise<{
    guide?: string;
    lang?: string;
    near?: string;
    stops?: string;
    from?: string;
  }>;
}) {
  const { iso2 } = await params;
  const {
    guide: guideId,
    lang,
    near: nearRaw,
    stops: stopsRaw,
    from: fromRaw,
  } = await searchParams;

  const country = findCountry(iso2);
  if (!country) notFound();

  const guide =
    (guideId ? findAgentIdentity(country, guideId) : null) ??
    getAgentIdentities(country)[0];
  if (!guide) notFound();

  const near = parseNear(nearRaw) ?? defaultNear(stopsRaw);
  const stops = parseStops(stopsRaw);
  const from =
    fromRaw === "walk" || fromRaw === "globe" ? fromRaw : null;

  return (
    <Stay22Experience
      country={country}
      guide={guide}
      localTime={localTimeFromLongitude(country.lng)}
      near={near}
      language={lang ?? null}
      stops={stops}
      from={from}
    />
  );
}

function parseNear(raw?: string): StayNear | null {
  if (!raw) return null;
  if (raw === "capital" || raw === "attraction") return raw;
  if (isDestinationId(raw)) return raw;
  return null;
}

function defaultNear(stopsRaw?: string): StayNear {
  const stops = parseStops(stopsRaw);
  if (stops.includes("home")) return "home";
  if (stops.includes("market")) return "market";
  if (stops.includes("street")) return "street";
  return "capital";
}

function parseStops(raw?: string): DestinationId[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(isDestinationId);
}
