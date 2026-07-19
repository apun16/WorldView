"use client";

import { useMemo, useRef, useState } from "react";
import type { CountryFeature } from "@/lib/geo-types";
import { fuzzyDistance, fuzzyThreshold } from "@/lib/fuzzy-match";

export default function CountrySearch({
  countries,
  onSelect,
}: {
  countries: CountryFeature[];
  onSelect: (country: CountryFeature) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const substringMatches = countries
      .filter((c) => c.properties.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const an = a.properties.name.toLowerCase();
        const bn = b.properties.name.toLowerCase();
        const aStarts = an.startsWith(q) ? 0 : 1;
        const bStarts = bn.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return an.localeCompare(bn);
      });

    if (substringMatches.length >= 8) return substringMatches.slice(0, 8);

    const threshold = fuzzyThreshold(q.length);
    const seen = new Set(substringMatches.map((c) => c.properties.iso2));
    const fuzzyMatches = countries
      .filter((c) => !seen.has(c.properties.iso2))
      .map((c) => ({
        country: c,
        distance: fuzzyDistance(q, c.properties.name.toLowerCase()),
      }))
      .filter((m) => m.distance <= threshold)
      .sort((a, b) => a.distance - b.distance)
      .map((m) => m.country);

    return [...substringMatches, ...fuzzyMatches].slice(0, 8);
  }, [countries, query]);

  const pick = (country: CountryFeature) => {
    onSelect(country);
    setQuery(country.properties.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="absolute bottom-5 right-5 z-10 w-56 sm:w-64 transition-all duration-300">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search a country…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!matches.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(matches[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="w-full rounded-full border border-cream/15 bg-dusk-panel/85 px-4 py-2 text-sm text-cream placeholder:text-cream/40 backdrop-blur-md outline-none focus:border-apricot/50"
        />

        {open && matches.length > 0 && (
          <ul className="animate-in fade-in slide-in-from-bottom-3 duration-200 absolute bottom-full right-0 mb-2 max-h-64 w-full overflow-y-auto rounded-xl border border-cream/10 bg-dusk-panel/95 py-1 backdrop-blur-md">
            {matches.map((c, i) => (
              <li key={c.properties.iso2}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className={`block w-full truncate px-3.5 py-1.5 text-left text-sm ${
                    i === highlight
                      ? "bg-apricot/15 text-cream"
                      : "text-cream/70 hover:bg-cream/5"
                  }`}
                >
                  {c.properties.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
