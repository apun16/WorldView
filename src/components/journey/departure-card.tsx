import Link from "next/link";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import { findDestination, type DestinationId } from "@/lib/destinations";
import { walkHref } from "@/lib/walk/walk-plan";

/**
 * The handoff point into the walk. Confirms the recorded route, then hands off
 * to /explore/[iso2]/walk.
 */
export default function DepartureCard({
  country,
  guide,
  stops,
  language,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  /** Which language the guide should teach; null falls back on the walk route. */
  language?: string | null;
}) {
  return (
    <div>
      <h1 className="mt-2 font-serif text-3xl text-cream">
        {guide.name} is ready
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        Your route through {country.name} is saved.
      </p>

      <ol className="mt-8 flex flex-col gap-px overflow-hidden rounded-2xl border border-cream/10">
        {stops.map((id, index) => {
          const destination = findDestination(id);
          if (!destination) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-4 bg-cream/[0.03] px-4 py-3.5"
            >
              <span className="font-serif text-sm italic text-apricot/70">
                {index + 1}
              </span>
              <span className="text-lg text-cream/40">{destination.glyph}</span>
              <span>
                <span className="block text-sm text-cream">
                  {destination.label}
                </span>
                <span className="mt-0.5 block text-xs text-cream/45">
                  {destination.tagline}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-2xl border border-cream/10 bg-cream/[0.03] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/45">
          Next
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cream/60">
          {guide.name} will meet you at the first stop and move between these
          places with you, teaching you words as you go.
        </p>
        <Link
          href={walkHref(country.iso2, guide.id, stops, language)}
          className="mt-5 block w-full rounded-full bg-apricot px-4 py-2.5 text-center text-sm font-semibold text-dusk-deep transition-colors hover:bg-[#f8cb95]"
        >
          Enter the walk →
        </Link>
      </div>

      <Link
        href="/explore"
        className="mt-8 inline-block text-xs text-cream/45 underline decoration-cream/20 underline-offset-4 transition-colors hover:text-cream/80"
      >
        plan another journey →
      </Link>
    </div>
  );
}
