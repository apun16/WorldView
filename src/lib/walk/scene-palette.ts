import type { DestinationId } from "@/lib/destinations";
import type { TimeOfDay } from "@/lib/local-time";
import { mixHex } from "@/lib/color";

export type ScenePalette = {
  /** Top of the sky. */
  zenith: string;
  /** Sky at the horizon line. */
  horizon: string;
  /** The sun/moon disc glow. */
  sun: string;
  /** Silhouetted buildings/trees along the horizon. */
  silhouette: string;
  ground: string;
  /** Fog/haze colour, also used to tint real photospheres. */
  haze: string;
  ambientIntensity: number;
  sunIntensity: number;
  /** 0-1 across the sky, where the light source sits. */
  sunX: number;
};

// Time of day sets the light; the destination shifts the ground and the
// silhouette. Splitting it this way means 6 time palettes and 5 destination
// accents rather than 30 hand-authored combinations.
const TIME_PALETTES: Record<
  TimeOfDay,
  Omit<ScenePalette, "ground" | "silhouette"> & { groundBase: string }
> = {
  dawn: {
    zenith: "#1b2450",
    horizon: "#f0a878",
    sun: "#ffd9a0",
    haze: "#c99b86",
    groundBase: "#2a2536",
    ambientIntensity: 0.55,
    sunIntensity: 0.6,
    sunX: 0.12,
  },
  morning: {
    zenith: "#2f6fb5",
    horizon: "#bcd9ef",
    sun: "#fff6dc",
    haze: "#9fc0dc",
    groundBase: "#4a4a44",
    ambientIntensity: 0.85,
    sunIntensity: 0.9,
    sunX: 0.28,
  },
  midday: {
    zenith: "#2477c4",
    horizon: "#d7ecfb",
    sun: "#ffffff",
    haze: "#b8d4e8",
    groundBase: "#5a5850",
    ambientIntensity: 1.0,
    sunIntensity: 1.0,
    sunX: 0.5,
  },
  afternoon: {
    zenith: "#3a72ae",
    horizon: "#f2d9ab",
    sun: "#ffe9b8",
    haze: "#cbb493",
    groundBase: "#544a3c",
    ambientIntensity: 0.9,
    sunIntensity: 0.85,
    sunX: 0.7,
  },
  evening: {
    zenith: "#241a44",
    horizon: "#e2743f",
    sun: "#ffbe72",
    haze: "#9c6a55",
    groundBase: "#2c2430",
    ambientIntensity: 0.5,
    sunIntensity: 0.5,
    sunX: 0.88,
  },
  night: {
    // Matches the app background in layout.tsx so the walk feels continuous
    // with the rest of the product at night.
    zenith: "#05070d",
    horizon: "#16203a",
    sun: "#cdd8f0",
    haze: "#101828",
    groundBase: "#12141c",
    ambientIntensity: 0.28,
    sunIntensity: 0.22,
    sunX: 0.62,
  },
};

const DESTINATION_ACCENTS: Record<
  DestinationId,
  { ground: string; silhouette: string }
> = {
  market: { ground: "#6b4a2f", silhouette: "#2a1d16" },
  home: { ground: "#5c463a", silhouette: "#241a17" },
  school: { ground: "#57565c", silhouette: "#1e2028" },
  nature: { ground: "#3f5c34", silhouette: "#15251a" },
  street: { ground: "#4c4c50", silhouette: "#1a1b20" },
};

export function scenePalette(
  destination: DestinationId,
  period: TimeOfDay
): ScenePalette {
  const time = TIME_PALETTES[period];
  const accent = DESTINATION_ACCENTS[destination];

  // Pull the destination's ground and silhouette toward the time-of-day base so
  // a market at night is dark earth rather than daylight earth on a dark sky.
  const towardTime = period === "night" ? 0.66 : period === "evening" ? 0.4 : 0.2;

  return {
    zenith: time.zenith,
    horizon: time.horizon,
    sun: time.sun,
    haze: time.haze,
    ground: mixHex(accent.ground, time.groundBase, towardTime),
    silhouette: mixHex(accent.silhouette, time.zenith, towardTime * 0.5),
    ambientIntensity: time.ambientIntensity,
    sunIntensity: time.sunIntensity,
    sunX: time.sunX,
  };
}
