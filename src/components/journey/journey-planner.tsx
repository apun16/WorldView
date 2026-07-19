"use client";

import { useState } from "react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import {
  DESTINATIONS,
  MAX_STOPS,
  MIN_STOPS,
  findDestination,
  type DestinationId,
} from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import { recordJourney } from "@/lib/journey-history";
import JourneyShell from "@/components/journey/journey-shell";
import DepartureCard from "@/components/journey/departure-card";

export default function JourneyPlanner({
  country,
  guide,
  localTime,
  language,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  /** Computed on the server so hydration cannot disagree about the hour. */
  localTime: LocalTime;
  /** Language the guide should teach, chosen back on the globe. */
  language?: string | null;
}) {
  const [stops, setStops] = useState<DestinationId[]>([]);
  const [departed, setDeparted] = useState(false);

  const isFull = stops.length >= MAX_STOPS;
  const canDepart = stops.length >= MIN_STOPS && stops.length <= MAX_STOPS;

  const toggleStop = (id: DestinationId) => {
    setStops((current) => {
      if (current.includes(id)) return current.filter((s) => s !== id);
      if (current.length >= MAX_STOPS) return current;
      return [...current, id];
    });
  };

  const depart = () => {
    recordJourney({
      iso2: country.iso2,
      guideId: guide.id,
      guideName: guide.name,
      stops,
    });
    setDeparted(true);
  };

  if (departed) {
    return (
      <JourneyShell country={country}>
        <DepartureCard
          country={country}
          guide={guide}
          stops={stops}
          language={language}
        />
      </JourneyShell>
    );
  }

  return (
    <JourneyShell country={country}>
      <h1 className="mt-2 font-serif text-3xl text-cream">
        Walking with {guide.name}
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        It&apos;s <span className="text-cream">{localTime.label}</span> in{" "}
        {country.capital} — {localTime.mood}.
      </p>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/45">
            Where should {guide.name} take you?
          </p>
          <p className="text-xs text-cream/35">
            {stops.length} of {MAX_STOPS}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DESTINATIONS.map((destination) => {
            const order = stops.indexOf(destination.id);
            const picked = order !== -1;
            const disabled = !picked && isFull;

            return (
              <button
                key={destination.id}
                onClick={() => toggleStop(destination.id)}
                disabled={disabled}
                aria-pressed={picked}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  picked
                    ? "border-apricot/50 bg-apricot/10"
                    : disabled
                      ? "cursor-not-allowed border-cream/5 bg-cream/[0.02] opacity-40"
                      : "border-cream/10 bg-cream/[0.03] hover:border-apricot/30 hover:bg-apricot/[0.06]"
                }`}
              >
                <span
                  className={`mt-0.5 font-serif text-lg ${
                    picked ? "text-apricot" : "text-cream/40"
                  }`}
                >
                  {picked ? order + 1 : destination.glyph}
                </span>
                <span>
                  <span className="block text-sm text-cream">
                    {destination.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-cream/55">
                    {destination.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/45">
          Your route
        </p>

        {stops.length === 0 ? (
          <p className="mt-3 font-serif text-sm italic text-cream/40">
            Pick {MIN_STOPS} places to build a walk.
          </p>
        ) : (
          <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-3">
            {stops.map((id, index) => {
              const destination = findDestination(id);
              if (!destination) return null;
              return (
                <li key={id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStop(id)}
                    title={`Remove ${destination.label}`}
                    className="group flex items-center gap-2 rounded-full border border-apricot/30 bg-apricot/10 py-1.5 pl-3.5 pr-2.5 text-xs text-apricot transition-colors hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
                  >
                    {destination.label}
                    <span className="text-apricot/50 group-hover:text-ember/70">
                      ×
                    </span>
                  </button>
                  {index < stops.length - 1 && (
                    <span className="text-cream/25">→</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <button
        onClick={depart}
        disabled={!canDepart}
        className={`mt-10 w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors sm:w-auto sm:self-start sm:px-8 ${
          canDepart
            ? "bg-apricot text-dusk-deep hover:bg-[#f8cb95]"
            : "cursor-not-allowed bg-cream/5 text-cream/35"
        }`}
      >
        {canDepart
          ? `Begin the walk with ${guide.name}`
          : `Pick ${MIN_STOPS - stops.length} more ${
              MIN_STOPS - stops.length === 1 ? "place" : "places"
            }`}
      </button>
    </JourneyShell>
  );
}
