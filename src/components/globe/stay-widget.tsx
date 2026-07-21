"use client";

import Link from "next/link";
import { stay22Href } from "@/lib/stay22-links";

const STAY22_AID = process.env.NEXT_PUBLIC_STAY22_AID ?? "";

/**
 * Guest-night teaser — map is atmosphere only; click opens the dossier.
 * Overlay captures clicks so the iframe does not swallow them.
 */
export default function StayWidget({
  lat,
  lng,
  place,
  iso2,
  guideId,
  language,
}: {
  lat: number;
  lng: number;
  place: string;
  iso2: string;
  guideId?: string | null;
  language?: string | null;
}) {
  if (!STAY22_AID) return null;

  const capital = place.split(",")[0]?.trim() || place;

  const params = new URLSearchParams({
    aid: STAY22_AID,
    lat: String(lat),
    lng: String(lng),
    address: place,
    zoom: "12",
    limit: "10",
    mapstyle: "dark",
    maincolor: "38bdf8",
    fontcolor: "e2e8f0",
    hidebrandlogo: "true",
    hidelanguage: "true",
    hidesettings: "true",
  });

  const href = stay22Href(iso2, {
    guide: guideId,
    lang: language,
    near: "capital",
    from: "globe",
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <iframe
        src={`https://www.stay22.com/embed/gm?${params.toString()}`}
        className="pointer-events-none h-[300px] w-full"
        loading="lazy"
        title={`Guest night near ${capital}`}
        tabIndex={-1}
      />
      <Link
        href={href}
        className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-[#05070d]/90 via-[#05070d]/25 to-transparent p-4 transition-colors hover:from-[#05070d]"
      >
        <span className="rounded-full bg-sky-400/90 px-5 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300">
          guest night in {capital} →
        </span>
        <span className="mt-2 font-mono text-[10px] text-zinc-400">
          where locals put guests up
        </span>
      </Link>
    </div>
  );
}
