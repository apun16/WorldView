"use client";

import { useMemo } from "react";
import type { CountryFeature } from "@/lib/geo-types";
import type { Agent } from "@/lib/agents";
import type { PanelView } from "@/components/globe/culture-globe";

export default function CulturePanel({
  panel,
  countries,
  selectedAgent,
  onSelectContinent,
  onSelectLanguage,
  onSelectCountryFromList,
  onClose,
}: {
  panel: PanelView;
  countries: CountryFeature[];
  selectedAgent: Agent | null;
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
            ← back to globe
          </button>

          {panel.kind === "country" && (
            <CountryView
              country={panel.country}
              selectedAgent={selectedAgent}
              onSelectContinent={onSelectContinent}
              onSelectLanguage={onSelectLanguage}
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

              <div className="mt-6 flex flex-wrap gap-2">
                {continentLanguages.map(({ language, count }) => (
                  <button
                    key={language}
                    onClick={() => onSelectLanguage(panel.continent, language)}
                    className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 font-mono text-xs text-amber-200 transition-colors hover:bg-amber-300/20"
                  >
                    {language}
                    <span className="ml-1.5 text-amber-200/50">{count}</span>
                  </button>
                ))}
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
                {panel.countries.length} {panel.countries.length === 1 ? "country speaks" : "countries speak"}{" "}
                {panel.language} in {panel.continent}.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {panel.countries.map((c) => (
                  <button
                    key={c.properties.iso2}
                    onClick={() => onSelectCountryFromList(c)}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-sky-400/40 hover:bg-sky-400/10"
                  >
                    <div>
                      <div className="text-sm text-zinc-100">{c.properties.name}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{c.properties.capital}</div>
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
  selectedAgent,
  onSelectContinent,
  onSelectLanguage,
}: {
  country: CountryFeature;
  selectedAgent: Agent | null;
  onSelectContinent: (continent: string) => void;
  onSelectLanguage: (continent: string, language: string) => void;
}) {
  const p = country.properties;
  const agent = selectedAgent?.iso2 === p.iso2 ? selectedAgent : null;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
        {p.continent}
      </p>
      <h2 className="mt-2 font-serif text-3xl text-zinc-50">{p.name}</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Meet a guide in <span className="text-zinc-200">{p.capital}</span>
      </p>

      <div className="mt-6">
        <p className="font-mono text-xs text-zinc-500">languages spoken here</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.languages.length === 0 && (
            <span className="text-xs text-zinc-600">no data available</span>
          )}
          {p.languages.map((lang) => (
            <button
              key={lang}
              onClick={() => onSelectLanguage(p.continent, lang)}
              className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1.5 font-mono text-xs text-sky-200 transition-colors hover:bg-sky-400/20"
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSelectContinent(p.continent)}
        className="mt-8 font-mono text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-300"
      >
        see every language in {p.continent} →
      </button>

      {agent && (
        <div className="mt-8 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/[0.07] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fuchsia-300/70">
            selected guide
          </p>
          <p className="mt-2 font-serif text-xl text-zinc-50">{agent.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            A guide in {p.capital}. Coming soon: walk through the market together.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs leading-relaxed text-zinc-400">
          {agent
            ? `${agent.name} will walk you through a market, a home, and the street — teaching you words as you go.`
            : `A local guide in ${p.capital} will walk you through a market, a home, and the street — teaching you words as you go.`}
        </p>
        <button
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-full bg-sky-400/20 px-4 py-2.5 text-center font-mono text-xs text-sky-300/60"
        >
          begin the walk — coming soon
        </button>
      </div>
    </div>
  );
}
