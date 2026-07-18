"use client";

import Link from "next/link";
import type { DialogueBeat } from "@/lib/walk/walk-script";
import type { WalkPhase } from "@/components/walk/walk-engine";
import { findDestination, type DestinationId } from "@/lib/destinations";

export default function WalkOverlay({
  guideName,
  countryIso2,
  stops,
  stopIndex,
  phase,
  beat,
  hidden,
  showGyro,
  onAdvance,
  onEnableGyro,
}: {
  guideName: string;
  countryIso2: string;
  stops: DestinationId[];
  stopIndex: number;
  phase: WalkPhase;
  beat: DialogueBeat | null;
  /** True in immersive XR, where the in-world panel takes over. */
  hidden: boolean;
  showGyro: boolean;
  onAdvance: () => void;
  onEnableGyro: () => void;
}) {
  if (hidden) return null;

  const destination = findDestination(stops[stopIndex]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#05070d]/80 px-4 py-2 backdrop-blur">
          {stops.map((stop, index) => (
            <span
              key={stop}
              title={findDestination(stop)?.label ?? stop}
              className={`h-1.5 rounded-full transition-all ${
                index === stopIndex
                  ? "w-6 bg-sky-300"
                  : index < stopIndex
                    ? "w-1.5 bg-sky-300/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
          <span className="ml-1 font-mono text-[11px] text-zinc-400">
            {destination?.label ?? ""}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {showGyro && (
            <button
              onClick={onEnableGyro}
              className="rounded-full border border-white/10 bg-[#05070d]/80 px-3.5 py-2 font-mono text-[11px] text-zinc-300 backdrop-blur transition-colors hover:text-white"
            >
              use motion
            </button>
          )}
          <Link
            href="/explore"
            className="rounded-full border border-white/10 bg-[#05070d]/80 px-3.5 py-2 font-mono text-[11px] text-zinc-400 backdrop-blur transition-colors hover:text-zinc-200"
          >
            leave walk
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {beat && (
          <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#05070d]/88 p-5 backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/70">
              {guideName}
            </p>
            <p className="mt-2 text-base leading-relaxed text-zinc-100">{beat.text}</p>

            {beat.word && (
              <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3">
                <p className="font-serif text-2xl text-amber-200">{beat.word.term}</p>
                {beat.word.roman && (
                  <p className="mt-0.5 font-mono text-xs italic text-amber-200/70">
                    {beat.word.roman}
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-400">{beat.word.gloss}</p>
              </div>
            )}
          </div>
        )}

        {phase === "complete" ? (
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <p className="text-center text-sm text-zinc-300">
              You walked with {guideName} through {stops.length} places.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/explore/${countryIso2}/journey`}
                className="rounded-full bg-sky-400/90 px-6 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300"
              >
                plan another walk →
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-white/15 px-6 py-2.5 font-mono text-xs text-zinc-300 transition-colors hover:text-white"
              >
                back to globe
              </Link>
            </div>
          </div>
        ) : (
          <button
            onClick={onAdvance}
            className="pointer-events-auto rounded-full bg-sky-400/90 px-7 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300"
          >
            {advanceLabel(phase, stops, stopIndex)}
          </button>
        )}
      </div>
    </div>
  );
}

function advanceLabel(
  phase: WalkPhase,
  stops: DestinationId[],
  stopIndex: number
): string {
  if (phase === "arriving") return "skip ahead";
  if (phase === "leaving") return "walking…";
  if (phase === "ready") {
    const next = findDestination(stops[stopIndex + 1]);
    return next ? `walk to ${next.label.toLowerCase()} →` : "finish the walk →";
  }
  return "continue →";
}
