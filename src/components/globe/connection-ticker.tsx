"use client";

import { useEffect, useState } from "react";

type Arc = {
  fromName: string;
  toName: string;
  label: string;
};

export default function ConnectionTicker({ connections }: { connections: Arc[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (connections.length === 0) return;
    let cancelled = false;
    const cycle = () => {
      setVisible(true);
      setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        setTimeout(() => {
          if (cancelled) return;
          setIndex((i) => (i + 1) % connections.length);
          cycle();
        }, 700);
      }, 4200);
    };
    const kickoff = setTimeout(cycle, 1500);
    return () => {
      cancelled = true;
      clearTimeout(kickoff);
    };
  }, [connections.length]);

  if (connections.length === 0) return null;
  const arc = connections[index];

  return (
    <div
      className={`pointer-events-none absolute bottom-14 left-6 w-[min(85vw,420px)] transition-opacity duration-700 sm:bottom-16 sm:left-10 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/70">
        semantic connection
      </p>
      <p className="mt-1.5 font-mono text-xs leading-relaxed text-amber-100/90">
        <span className="text-amber-300">
          {arc.fromName} → {arc.toName}
        </span>
        <br />
        {arc.label}
      </p>
    </div>
  );
}
