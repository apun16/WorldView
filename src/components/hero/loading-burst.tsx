"use client";

import { useEffect, useState } from "react";

/**
 * Home-entry burst: a sky-toned flash that lands on the wordmark,
 * then dissolves into the ASCII landing page.
 */
export default function LoadingBurst() {
  const [phase, setPhase] = useState<"burst" | "fade" | "done">("burst");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), 1500);
    const doneTimer = window.setTimeout(() => setPhase("done"), 2300);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`loading-burst pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#05070d] ${
        phase === "fade" ? "loading-burst--out" : ""
      }`}
      aria-hidden
    >
      <div className="scanlines absolute inset-0 opacity-60" />

      {/* Expanding sky rings */}
      <div className="loading-burst__ring loading-burst__ring--a" />
      <div className="loading-burst__ring loading-burst__ring--b" />
      <div className="loading-burst__ring loading-burst__ring--c" />

      {/* Radial rays */}
      <div className="loading-burst__rays">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className="loading-burst__ray"
            style={{ transform: `rotate(${i * 22.5}deg)` }}
          />
        ))}
      </div>

      {/* Soft center glow */}
      <div className="loading-burst__glow" />

      <p className="loading-burst__mark font-serif text-5xl tracking-tight text-zinc-50 sm:text-7xl md:text-8xl">
        worldview
      </p>
    </div>
  );
}
