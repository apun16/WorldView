import Link from "next/link";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import { findDestination, type DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import WalkSession from "@/components/journey/walk-session";

/**
 * Confirms the planned route, then hands off to a live ElevenLabs voice walk.
 */
export default function DepartureCard({
  country,
  guide,
  stops,
  localTime,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  localTime: LocalTime;
}) {
  return (
    <div>
      <h1 className="mt-2 font-serif text-3xl text-zinc-50">
        {guide.name} is ready
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Your route through {country.name} is saved.
      </p>

      <ol className="mt-8 flex flex-col gap-px overflow-hidden rounded-xl border border-white/10">
        {stops.map((id, index) => {
          const destination = findDestination(id);
          if (!destination) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-4 bg-white/[0.03] px-4 py-3.5"
            >
              <span className="font-mono text-xs text-sky-300/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-lg text-zinc-500">
                {destination.glyph}
              </span>
              <span>
                <span className="block text-sm text-zinc-100">
                  {destination.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {destination.tagline}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <WalkSession
        country={country}
        guide={guide}
        stops={stops}
        localTime={localTime}
      />

      <Link
        href="/explore"
        className="mt-8 inline-block font-mono text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300"
      >
        plan another journey →
      </Link>
    </div>
  );
}
