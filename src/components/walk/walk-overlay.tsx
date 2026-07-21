"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { WalkPhase } from "@/components/walk/walk-engine";
import { findDestination, type DestinationId } from "@/lib/destinations";
import { stay22Href } from "@/lib/stay22-links";

export default function WalkOverlay({
  guideName,
  guideId,
  countryIso2,
  stops,
  stopIndex,
  phase,
  hidden,
  showGyro,
  onAdvance,
  onEnableGyro,
  photoCredit,
  teaching,
  language,
}: {
  guideName: string;
  guideId: string;
  countryIso2: string;
  stops: DestinationId[];
  stopIndex: number;
  phase: WalkPhase;
  /** True in immersive XR, where the in-world panel takes over. */
  hidden: boolean;
  showGyro: boolean;
  onAdvance: () => void;
  onEnableGyro: () => void;
  /** Shown when a CC BY-SA image is on screen; the licence requires it. */
  photoCredit?: string | null;
  /** Live ElevenLabs teaching UI — replaces the old scripted scenery box. */
  teaching?: ReactNode;
  language?: string | null;
}) {
  if (hidden) return null;

  const destination = findDestination(stops[stopIndex]);
  const atHome = stops[stopIndex] === "home" && phase === "ready";
  const stayHref = stay22Href(countryIso2, {
    guide: guideId,
    lang: language,
    near:
      stops[stopIndex] === "home"
        ? "home"
        : (stops[stops.length - 1] ?? "capital"),
    stops,
    from: "walk",
  });

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

      {photoCredit && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/35">
          360° photo © {photoCredit} · Mapillary · CC BY-SA
        </p>
      )}

      <div className="flex w-full flex-col items-center gap-4">
        {teaching}

        {atHome && (
          <Link
            href={stayHref}
            className="pointer-events-auto rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-4 py-2 font-mono text-[11px] text-amber-100/90 transition-colors hover:border-amber-300/40"
          >
            if you stayed the night →
          </Link>
        )}

        {phase === "complete" ? (
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <p className="text-center text-sm text-zinc-300">
              You walked with {guideName} through {stops.length} places.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={stayHref}
                className="rounded-full bg-sky-400/90 px-6 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300"
              >
                sleep where you walked →
              </Link>
              <Link
                href={`/explore/${countryIso2}/journey`}
                className="rounded-full border border-white/15 px-6 py-2.5 font-mono text-xs text-zinc-300 transition-colors hover:text-white"
              >
                plan another walk
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
