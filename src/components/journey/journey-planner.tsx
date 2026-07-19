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
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  /** Computed on the server so hydration cannot disagree about the hour. */
  localTime: LocalTime;
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
          localTime={localTime}
        />
      </JourneyShell>
    );
  }

  return (
    <JourneyShell country={country}>
      <h1 className="mt-2 font-serif text-3xl text-zinc-50">
        Walking with {guide.name}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        It&apos;s <span className="text-zinc-200">{localTime.label}</span> in{" "}
        {country.capital} — {localTime.mood}.
      </p>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-xs text-zinc-500">
            where should {guide.name} take you?
          </p>
          <p className="font-mono text-[11px] text-zinc-600">
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
                    ? "border-sky-400/50 bg-sky-400/10"
                    : disabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                      : "border-white/10 bg-white/[0.03] hover:border-sky-400/30 hover:bg-sky-400/[0.06]"
                }`}
              >
                <span
                  className={`mt-0.5 font-mono text-lg ${
                    picked ? "text-sky-300" : "text-zinc-500"
                  }`}
                >
                  {picked ? order + 1 : destination.glyph}
                </span>
                <span>
                  <span className="block text-sm text-zinc-100">
                    {destination.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                    {destination.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <p className="font-mono text-xs text-zinc-500">your route</p>

        {stops.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
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
                    className="group flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 py-1.5 pl-3.5 pr-2.5 font-mono text-xs text-sky-200 transition-colors hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200"
                  >
                    {destination.label}
                    <span className="text-sky-200/50 group-hover:text-rose-200/70">
                      ×
                    </span>
                  </button>
                  {index < stops.length - 1 && (
                    <span className="text-zinc-700">→</span>
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
        className={`mt-10 w-full rounded-full px-4 py-3 text-center font-mono text-xs transition-colors sm:w-auto sm:self-start sm:px-8 ${
          canDepart
            ? "bg-sky-400/90 text-[#05070d] hover:bg-sky-300"
            : "cursor-not-allowed bg-white/5 text-zinc-600"
        }`}
      >
        {canDepart
          ? `begin the walk with ${guide.name}`
          : `pick ${MIN_STOPS - stops.length} more ${
              MIN_STOPS - stops.length === 1 ? "place" : "places"
            }`}
      </button>
    </JourneyShell>
  );
}
