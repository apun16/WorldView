import type { DestinationId } from "@/lib/destinations";
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

// Scenes always render in good daylight. Time-of-day lighting existed here and
// was removed deliberately: every sourced photosphere is a daylight photograph,
// so an evening or night walk meant grading a bright photo down until the place
// was simply hard to look at, which is a worse experience than a small
// inaccuracy about the local hour.
const DAYLIGHT = {
  zenith: "#2477c4",
  horizon: "#d7ecfb",
  sun: "#ffffff",
  haze: "#b8d4e8",
  groundBase: "#5a5850",
  ambientIntensity: 1.0,
  sunIntensity: 1.0,
  sunX: 0.5,
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

export function scenePalette(destination: DestinationId): ScenePalette {
  const accent = DESTINATION_ACCENTS[destination];

  // Pull the destination's ground and silhouette slightly toward the daylight
  // base so they sit in the same light as the sky.
  const towardBase = 0.2;

  return {
    zenith: DAYLIGHT.zenith,
    horizon: DAYLIGHT.horizon,
    sun: DAYLIGHT.sun,
    haze: DAYLIGHT.haze,
    ground: mixHex(accent.ground, DAYLIGHT.groundBase, towardBase),
    silhouette: mixHex(accent.silhouette, DAYLIGHT.zenith, towardBase * 0.5),
    ambientIntensity: DAYLIGHT.ambientIntensity,
    sunIntensity: DAYLIGHT.sunIntensity,
    sunX: DAYLIGHT.sunX,
  };
}
