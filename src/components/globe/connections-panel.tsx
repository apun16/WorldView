"use client";

import type { Alliance } from "@/lib/alliances";

export default function ConnectionsPanel({
  alliances,
  activeAlliances,
  onToggleAlliance,
  showLanguageThreads,
  onToggleLanguageThreads,
}: {
  alliances: Alliance[];
  activeAlliances: Set<string>;
  onToggleAlliance: (id: string) => void;
  showLanguageThreads: boolean;
  onToggleLanguageThreads: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute left-6 top-1/2 z-10 flex w-52 -translate-y-1/2 flex-col gap-3 rounded-lg border border-white/10 bg-[#070a14]/80 px-4 py-3 backdrop-blur-md sm:left-10">
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-300/70">
          Threads
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={showLanguageThreads}
            onChange={onToggleLanguageThreads}
            className="accent-sky-400"
          />
          Same language
        </label>
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/70">
          Alliances
        </div>
        <div className="flex flex-col gap-1.5">
          {alliances.map((alliance) => (
            <label
              key={alliance.id}
              className="flex cursor-pointer items-center gap-2 font-mono text-xs text-zinc-300"
            >
              <input
                type="checkbox"
                checked={activeAlliances.has(alliance.id)}
                onChange={() => onToggleAlliance(alliance.id)}
                style={{ accentColor: alliance.color }}
              />
              <span style={{ color: alliance.color }}>●</span>
              {alliance.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
