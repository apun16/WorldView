import Link from "next/link";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import { findDestination, type DestinationId } from "@/lib/destinations";

/**
 * The handoff point. The VR/AR walk takes over from here — until it exists,
 * this confirms the route was recorded and shows what was planned.
 */
export default function DepartureCard({
  country,
  guide,
  stops,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
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

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          next
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This is where the walk begins — {guide.name} moving between these
          places, speaking with you as you go. That experience is still being
          built.
        </p>
        <button
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-full bg-white/5 px-4 py-2.5 text-center font-mono text-xs text-zinc-600"
        >
          enter the walk — coming soon
        </button>
      </div>

      <Link
        href="/explore"
        className="mt-8 inline-block font-mono text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300"
      >
        plan another journey →
      </Link>
    </div>
  );
}
