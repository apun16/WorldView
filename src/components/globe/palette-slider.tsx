"use client";

import type { GlobePalette } from "@/lib/globe-palettes";

export default function PaletteSlider({
  palettes,
  index,
  onChange,
}: {
  palettes: GlobePalette[];
  index: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-[#070a14]/80 px-4 py-2.5 backdrop-blur-md">
      <span className="font-mono text-[10px] tracking-widest text-zinc-400">
        {palettes[index].name}
      </span>
      <input
        type="range"
        min={0}
        max={palettes.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-48 cursor-pointer appearance-none rounded-full bg-white/15 accent-current"
      />
      <div className="flex w-48 justify-between font-mono text-[8px] text-zinc-500">
        {palettes.map((p, i) => (
          <span key={p.id} className={i === index ? "text-zinc-200" : ""}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
