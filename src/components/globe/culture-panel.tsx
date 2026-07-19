"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CountryFeature } from "@/lib/geo-types";
import type { Agent } from "@/lib/agents";
import type { PanelView } from "@/components/globe/culture-globe";
import StayWidget from "@/components/globe/stay-widget";
import { isLanguageSupported } from "@/lib/supported-languages";
import { SEVERITY_COLOR, type CountryConflict } from "@/lib/acled";

export default function CulturePanel({
  panel,
  countries,
  agents,
  selectedAgent,
  onSelectAgent,
  onSelectContinent,
  onSelectLanguage,
  onSelectCountryFromList,
  onClose,
  conflict,
}: {
  panel: PanelView;
  countries: CountryFeature[];
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectContinent: (continent: string) => void;
  onSelectLanguage: (continent: string, language: string) => void;
  onSelectCountryFromList: (feat: object) => void;
  onClose: () => void;
  /** ACLED conflict rollup for the open country, if any. */
  conflict: CountryConflict | null;
}) {
  const continentLanguages = useMemo(() => {
    if (panel.kind !== "continent") return [];
    const langCountries = new Map<string, Set<string>>();
    for (const c of countries) {
      if (c.properties.continent !== panel.continent) continue;
      for (const lang of c.properties.languages) {
        if (!langCountries.has(lang)) langCountries.set(lang, new Set());
        langCountries.get(lang)!.add(c.properties.name);
      }
    }
    return Array.from(langCountries.entries())
      .map(([language, countrySet]) => ({ language, count: countrySet.size }))
      .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
  }, [panel, countries]);

  const open = panel.kind !== "idle";

  return (
    <div
      className={`absolute right-0 top-0 h-full w-[min(90vw,380px)] transform border-l border-white/10 bg-[#070a14]/92 backdrop-blur-md transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {open && (
        <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
          <button
            onClick={onClose}
            className="mb-6 self-start font-mono text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            ← back to the globe
          </button>

          {panel.kind === "country" && (
            <CountryView
              key={panel.country.properties.iso2}
              country={panel.country}
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={onSelectAgent}
              onSelectContinent={onSelectContinent}
              conflict={conflict}
            />
          )}

          {panel.kind === "continent" && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
                {panel.continent}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-zinc-50">
                Languages across {panel.continent}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Pick a language to see every country here you could learn it in.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {continentLanguages.map(({ language, count }) => {
                  const supported = isLanguageSupported(language);
                  return (
                    <button
                      key={language}
                      onClick={() => onSelectLanguage(panel.continent, language)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3.5 py-2.5 text-left transition-colors hover:border-amber-300/40 hover:bg-amber-300/10"
                    >
                      <span className="font-mono text-xs text-amber-200">
                        {language}
                        {!supported && (
                          <span className="ml-2 text-zinc-500">
                            language coming soon!
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-amber-200/50">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {panel.kind === "language" && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/70">
                {panel.continent} · {panel.language}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-zinc-50">
                Where to learn {panel.language}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {panel.countries.length}{" "}
                {panel.countries.length === 1 ? "country speaks" : "countries speak"}{" "}
                {panel.language} in {panel.continent}.
              </p>

              {!isLanguageSupported(panel.language) && (
                <p className="mt-3 font-mono text-xs text-zinc-500">
                  language coming soon!
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                {panel.countries.map((c) => (
                  <button
                    key={c.properties.iso2}
                    onClick={() => onSelectCountryFromList(c)}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-sky-400/40 hover:bg-sky-400/10"
                  >
                    <div>
                      <div className="text-sm text-zinc-100">{c.properties.name}</div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {c.properties.capital}
                      </div>
                    </div>
                    <span className="text-zinc-500">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CountryView({
  country,
  agents,
  selectedAgent,
  onSelectAgent,
  onSelectContinent,
  conflict,
}: {
  country: CountryFeature;
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectContinent: (continent: string) => void;
  conflict: CountryConflict | null;
}) {
  const p = country.properties;
  const agent = selectedAgent?.iso2 === p.iso2 ? selectedAgent : null;
  const [activeLanguage, setActiveLanguage] = useState<string | null>(
    () => p.languages.find(isLanguageSupported) ?? null
  );

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
        {p.continent}
      </p>
      <h2 className="mt-2 font-serif text-3xl text-zinc-50">{p.name}</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Meet a guide in <span className="text-zinc-200">{p.capital}</span>
      </p>

      {conflict && (
        <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-300/80">
              conflict activity · ACLED
            </p>
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
              style={{
                color: SEVERITY_COLOR[conflict.severity],
                borderColor: SEVERITY_COLOR[conflict.severity] + "55",
              }}
            >
              {conflict.severity}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-zinc-300">
            {conflict.summary}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                events
              </p>
              <p className="mt-0.5 font-mono text-sm text-zinc-100">
                {conflict.totalEvents.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                fatalities
              </p>
              <p className="mt-0.5 font-mono text-sm text-zinc-100">
                {conflict.totalFatalities.toLocaleString()}
              </p>
            </div>
          </div>

          {conflict.hotspots.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {conflict.hotspots.slice(0, 4).map((hotspot) => (
                <span
                  key={hotspot.location}
                  title={`${hotspot.topEventType ?? "activity"} · ${hotspot.events} events`}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-zinc-400"
                >
                  {hotspot.location} · {hotspot.fatalities}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className="font-mono text-xs text-zinc-500">languages spoken here</p>

        {p.languages.length === 0 && (
          <span className="mt-2 block text-xs text-zinc-600">no data available</span>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {p.languages.map((lang) => {
            const supported = isLanguageSupported(lang);
            const selected = supported && activeLanguage === lang;

            return (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  if (!supported) return;
                  setActiveLanguage((prev) => (prev === lang ? null : lang));
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-sky-400/40 bg-sky-400/10"
                    : "border-white/10 bg-white/[0.03]"
                } ${supported ? "cursor-pointer hover:bg-white/[0.04]" : "cursor-default"}`}
              >
                <span className="font-mono text-xs text-sky-200">
                  {lang}
                  {!supported && (
                    <span className="ml-2 text-zinc-500">
                      language coming soon!
                    </span>
                  )}
                </span>
                {selected && (
                  <span className="font-mono text-[10px] text-sky-300/50">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onSelectContinent(p.continent)}
        className="mt-8 font-mono text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-300"
      >
        see every language in {p.continent} →
      </button>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-xs text-zinc-500">guides you could meet</p>
          <p className="font-mono text-[11px] text-zinc-600">{agents.length}</p>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          {agents.map((a) => {
            const isSelected = a.id === agent?.id;
            return (
              <button
                key={a.id}
                onClick={() => onSelectAgent(a)}
                aria-pressed={isSelected}
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-fuchsia-400/40 bg-fuchsia-400/10"
                    : "border-white/10 bg-white/[0.03] hover:border-sky-400/30 hover:bg-sky-400/[0.07]"
                }`}
              >
                <span
                  className={`flex items-center gap-1.5 text-sm ${isSelected ? "text-zinc-50" : "text-zinc-300"}`}
                >
                  <span className="font-mono text-xs text-zinc-500">
                    {a.gender === "female" ? "♀" : "♂"}
                  </span>
                  {a.name}
                </span>
                {isSelected && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/70">
                    selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs leading-relaxed text-zinc-400">
          {activeLanguage ? (
            <>
              {agent ? agent.name : "A local guide"} will meet you in {p.capital}{" "}
              and walk you through a few places, teaching you{" "}
              <span className="text-zinc-200">{activeLanguage}</span> as you go.
            </>
          ) : (
            <>
              {agent ? agent.name : `A local guide in ${p.capital}`} will walk you
              through a market, a home, and the street — teaching you words as you
              go. Pick a language above to choose what they teach.
            </>
          )}
        </p>
        {agent ? (
          <Link
            href={`/explore/${p.iso2}/journey?guide=${agent.id}${
              activeLanguage ? `&lang=${encodeURIComponent(activeLanguage)}` : ""
            }`}
            className="mt-4 block w-full rounded-full bg-sky-400/90 px-4 py-2.5 text-center font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300"
          >
            plan your walk with {agent.name} →
          </Link>
        ) : (
          <p className="mt-4 text-center font-mono text-[11px] text-zinc-500">
            pick a guide on the map to begin
          </p>
        )}
      </div>

      <div className="mt-6">
        <p className="font-mono text-xs text-zinc-500">actually go there</p>
        <p className="mt-1 text-xs text-zinc-600">
          real stays in {p.capital}, booked right now — no imagination required.
        </p>
        <div className="mt-3">
          <StayWidget lat={p.lat} lng={p.lng} place={`${p.capital}, ${p.name}`} />
        </div>
      </div>
    </div>
  );
}
