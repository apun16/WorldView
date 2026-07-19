"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CountryFeature } from "@/lib/geo-types";
import type { Agent } from "@/lib/agents";
import type { PanelView } from "@/components/globe/culture-globe";
import {
  getScenarioOptions,
  isLanguageSupported,
  type ScenarioId,
} from "@/lib/supported-languages";

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
      className={`absolute right-0 top-0 h-full w-[min(90vw,380px)] transform border-l border-cream/10 bg-dusk-panel/92 backdrop-blur-md transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {open && (
        <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
          <button
            onClick={onClose}
            className="mb-6 self-start text-xs text-cream/45 transition-colors hover:text-cream/80"
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
              onSelectLanguage={onSelectLanguage}
            />
          )}

          {panel.kind === "continent" && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot/80">
                {panel.continent}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-cream">
                Languages across {panel.continent}
              </h2>
              <p className="mt-2 text-sm text-cream/60">
                Pick a language to see every country here you could learn it in.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {continentLanguages.map(({ language, count }) => {
                  const supported = isLanguageSupported(language);
                  return (
                    <button
                      key={language}
                      onClick={() => onSelectLanguage(panel.continent, language)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-apricot/20 bg-apricot/5 px-3.5 py-2.5 text-left transition-colors hover:border-apricot/40 hover:bg-apricot/10"
                    >
                      <span className="text-sm text-apricot">
                        {language}
                        {!supported && (
                          <span className="ml-2 font-serif italic text-cream/40">
                            coming soon
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-apricot/50">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot/80">
                {panel.continent} · {panel.language}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-cream">
                Where to learn {panel.language}
              </h2>
              <p className="mt-2 text-sm text-cream/60">
                {panel.countries.length}{" "}
                {panel.countries.length === 1 ? "country speaks" : "countries speak"}{" "}
                {panel.language} in {panel.continent}.
              </p>

              {!isLanguageSupported(panel.language) && (
                <p className="mt-3 font-serif text-sm italic text-cream/40">
                  coming soon
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                {panel.countries.map((c) => (
                  <button
                    key={c.properties.iso2}
                    onClick={() => onSelectCountryFromList(c)}
                    className="flex items-center justify-between rounded-xl border border-cream/10 bg-cream/5 px-4 py-3 text-left transition-colors hover:border-apricot/40 hover:bg-apricot/10"
                  >
                    <div>
                      <div className="text-sm text-cream">{c.properties.name}</div>
                      <div className="text-xs text-cream/45">
                        {c.properties.capital}
                      </div>
                    </div>
                    <span className="text-cream/40">→</span>
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
  onSelectLanguage,
}: {
  country: CountryFeature;
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectContinent: (continent: string) => void;
  onSelectLanguage: (continent: string, language: string) => void;
}) {
  const p = country.properties;
  const agent = selectedAgent?.iso2 === p.iso2 ? selectedAgent : null;
  const [activeLanguage, setActiveLanguage] = useState<string | null>(
    () => p.languages.find(isLanguageSupported) ?? null
  );
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);

  const scenarios = useMemo(() => {
    if (!activeLanguage) return [];
    return getScenarioOptions(p.capital, activeLanguage, p.iso2);
  }, [activeLanguage, p.capital, p.iso2]);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot/80">
        {p.continent}
      </p>
      <h2 className="mt-2 font-serif text-3xl text-cream">{p.name}</h2>
      <p className="mt-1 text-sm text-cream/60">
        Meet a guide in <span className="text-cream">{p.capital}</span>
      </p>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/45">
          Languages spoken here
        </p>

        {p.languages.length === 0 && (
          <span className="mt-2 block text-xs text-cream/35">no data available</span>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {p.languages.map((lang) => {
            const supported = isLanguageSupported(lang);
            const expanded = supported && activeLanguage === lang;

            return (
              <div
                key={lang}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  expanded
                    ? "border-apricot/40 bg-apricot/10"
                    : "border-cream/10 bg-cream/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!supported) return;
                    setActiveLanguage((prev) => (prev === lang ? null : lang));
                    setActiveScenario(null);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left ${
                    supported
                      ? "cursor-pointer hover:bg-cream/[0.04]"
                      : "cursor-default"
                  }`}
                >
                  <span className="text-sm text-apricot">
                    {lang}
                    {!supported && (
                      <span className="ml-2 font-serif italic text-cream/40">
                        coming soon
                      </span>
                    )}
                  </span>
                  {supported && (
                    <span className="text-xs text-apricot/50">
                      {expanded ? "−" : "+"}
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-cream/10 px-2.5 py-2">
                    <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/40">
                      Pick a place to begin
                    </p>
                    <div className="flex flex-col gap-1">
                      {scenarios.map((scenario) => {
                        const selected = activeScenario === scenario.id;
                        return (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => setActiveScenario(scenario.id)}
                            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              selected
                                ? "bg-apricot/20 text-cream"
                                : "text-cream/70 hover:bg-cream/5 hover:text-cream"
                            }`}
                          >
                            {scenario.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectLanguage(p.continent, lang)}
                      className="mt-2 w-full px-1 py-1.5 text-left text-xs text-cream/45 underline decoration-cream/20 underline-offset-4 transition-colors hover:text-cream/80"
                    >
                      see where else {lang} is spoken →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onSelectContinent(p.continent)}
        className="mt-8 text-xs text-cream/45 underline decoration-cream/20 underline-offset-4 transition-colors hover:text-cream/80"
      >
        see every language in {p.continent} →
      </button>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/45">
            Guides you could meet
          </p>
          <p className="text-xs text-cream/35">{agents.length}</p>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          {agents.map((a) => {
            const isSelected = a.id === agent?.id;
            return (
              <button
                key={a.id}
                onClick={() => onSelectAgent(a)}
                aria-pressed={isSelected}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-ember/50 bg-ember/10"
                    : "border-cream/10 bg-cream/[0.03] hover:border-apricot/30 hover:bg-apricot/[0.07]"
                }`}
              >
                <span
                  className={`flex items-center gap-1.5 text-sm ${isSelected ? "text-cream" : "text-cream/75"}`}
                >
                  <span className="text-xs text-cream/40">
                    {a.gender === "female" ? "♀" : "♂"}
                  </span>
                  {a.name}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ember">
                    selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-cream/10 bg-cream/[0.03] p-4">
        <p className="text-xs leading-relaxed text-cream/60">
          {activeLanguage ? (
            <>
              {agent ? agent.name : "A local guide"} will meet you in {p.capital}{" "}
              and walk you through a few places, teaching you{" "}
              <span className="text-cream">{activeLanguage}</span> as you go.
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
            className="mt-4 block w-full rounded-full bg-apricot px-4 py-2.5 text-center text-sm font-semibold text-dusk-deep transition-colors hover:bg-[#f8cb95]"
          >
            Plan your walk with {agent.name} →
          </Link>
        ) : (
          <p className="mt-4 text-center font-serif text-sm italic text-cream/45">
            pick a guide on the map to begin
          </p>
        )}
      </div>
    </div>
  );
}
