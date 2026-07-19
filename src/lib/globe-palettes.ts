import type { CountryProperties } from "@/lib/geo-types";
import { estimateAnnualTemp } from "@/lib/country-temperatures";

export type HeatmapSpec = {
  // Raw metric value for a country (e.g. °C, or a language count).
  metric: (props: CountryProperties) => number;
  // The raw-value range that maps onto the colour scale's 0..1 span.
  domain: [number, number];
  // Colour scale as [position 0..1, rgba] stops, low intensity -> high.
  scale: Array<[number, string]>;
  // End labels shown under the legend gradient.
  legend: { low: string; high: string };
};

export type GlobePalette = {
  id: string;
  name: string;
  base: string;
  hover: string;
  selected: string;
  languageMatch: string;
  continentGlow: string;
  stroke: string;
  atmosphere: string;
  globeColor: string;
  globeEmissive: string;
  side: string;
  // Present only for data views: colours each country by a metric.
  heatmap?: HeatmapSpec;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const GLOBE_PALETTES: GlobePalette[] = [
  {
    // #1 — the default regular earth globe: green land, blue sea.
    id: "earth",
    name: "Earth",
    base: "rgba(74, 222, 128, 0.16)",
    hover: "rgba(250, 204, 21, 0.9)",
    selected: "rgba(217, 70, 239, 0.75)",
    languageMatch: "rgba(251, 191, 36, 0.75)",
    continentGlow: "rgba(45, 212, 191, 0.3)",
    stroke: "rgba(190, 242, 200, 0.35)",
    atmosphere: "#22d3ee",
    globeColor: "#0c0a1a",
    globeEmissive: "#050310",
    side: "rgba(12, 10, 26, 0.55)",
  },
  {
    // #2 — climate heatmap coloured by real annual mean temperature.
    id: "climate",
    name: "Climate heat",
    base: "rgba(120, 120, 120, 0.1)",
    hover: "rgba(255, 255, 255, 0.92)",
    selected: "rgba(226, 232, 240, 0.85)",
    languageMatch: "rgba(250, 204, 21, 0.75)",
    continentGlow: "rgba(148, 163, 184, 0.22)",
    stroke: "rgba(120, 130, 150, 0.28)",
    atmosphere: "#f97316",
    globeColor: "#0a0e16",
    globeEmissive: "#04060b",
    side: "rgba(10, 12, 20, 0.6)",
    heatmap: {
      metric: estimateAnnualTemp,
      domain: [-15, 32],
      scale: [
        [0.0, "rgba(37, 99, 235, 0.62)"], // frigid — deep blue
        [0.28, "rgba(34, 211, 238, 0.6)"], // cold — cyan
        [0.55, "rgba(253, 224, 71, 0.62)"], // temperate — yellow
        [0.78, "rgba(249, 115, 22, 0.68)"], // warm — orange
        [1.0, "rgba(220, 38, 38, 0.75)"], // hot — red
      ],
      legend: { low: "−15°C", high: "32°C+" },
    },
  },
  {
    // #3 — how many languages each country lists.
    id: "diversity",
    name: "Language diversity",
    base: "rgba(120, 120, 120, 0.1)",
    hover: "rgba(255, 255, 255, 0.92)",
    selected: "rgba(226, 232, 240, 0.85)",
    languageMatch: "rgba(250, 204, 21, 0.75)",
    continentGlow: "rgba(148, 163, 184, 0.22)",
    stroke: "rgba(120, 130, 150, 0.28)",
    atmosphere: "#a855f7",
    globeColor: "#0c0a16",
    globeEmissive: "#050310",
    side: "rgba(12, 10, 22, 0.6)",
    heatmap: {
      metric: (p) => p.languages.length,
      domain: [1, 6],
      scale: [
        [0.0, "rgba(30, 58, 95, 0.5)"], // few languages — deep slate blue
        [0.5, "rgba(56, 189, 248, 0.62)"], // several — sky
        [1.0, "rgba(240, 171, 252, 0.78)"], // many — orchid
      ],
      legend: { low: "1 language", high: "6+ languages" },
    },
  },
];

/** Colour for a country under a heatmap palette, sampling its scale at the
 * country's metric position within the domain. */
export function heatColorFor(
  spec: HeatmapSpec,
  props: CountryProperties
): string {
  const raw = spec.metric(props);
  const t = clamp01((raw - spec.domain[0]) / (spec.domain[1] - spec.domain[0]));
  return sampleScale(spec.scale, t);
}

/** A CSS gradient string for the legend bar, from the scale stops. */
export function scaleToGradient(scale: Array<[number, string]>): string {
  return scale.map(([pos, color]) => `${color} ${Math.round(pos * 100)}%`).join(", ");
}

function sampleScale(scale: Array<[number, string]>, t: number): string {
  const clamped = clamp01(t);
  for (let i = 1; i < scale.length; i++) {
    const [p1, c1] = scale[i];
    if (clamped <= p1) {
      const [p0, c0] = scale[i - 1];
      const local = p1 === p0 ? 0 : (clamped - p0) / (p1 - p0);
      return mixRgba(c0, c1, local);
    }
  }
  return scale[scale.length - 1][1];
}

function mixRgba(a: string, b: string, t: number): string {
  const ca = parseRgba(a);
  const cb = parseRgba(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  const al = (ca[3] + (cb[3] - ca[3]) * t).toFixed(3);
  return `rgba(${r}, ${g}, ${bl}, ${al})`;
}

function parseRgba(color: string): [number, number, number, number] {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return [128, 128, 128, 1];
  const parts = m[1].split(",").map((p) => parseFloat(p));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}
