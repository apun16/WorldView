/**
 * Colour helpers for canvas/three.js drawing.
 *
 * `agent-marker.ts` has its own copy of `withAlpha`; this is not yet lifted out
 * of that file because it is under active change. Consolidate later.
 */

/** Re-expresses an `rgb()`, `rgba()`, or hex colour at a given alpha. */
export function withAlpha(color: string, alpha: number): string {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b] = rgba[1].split(",").map((part) => parseFloat(part));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

/** Blends two hex colours. `t` of 0 returns `a`, 1 returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(16))}${to2(mix(8))}${to2(mix(0))}`;
}
