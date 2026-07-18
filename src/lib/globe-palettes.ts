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
};

export const GLOBE_PALETTES: GlobePalette[] = [
  {
    id: "azure",
    name: "Azure (original)",
    base: "rgba(56, 189, 248, 0.12)",
    hover: "rgba(125, 211, 252, 0.85)",
    selected: "rgba(56, 189, 248, 0.75)",
    languageMatch: "rgba(251, 191, 36, 0.7)",
    continentGlow: "rgba(56, 189, 248, 0.28)",
    stroke: "rgba(148, 213, 251, 0.35)",
    atmosphere: "#38bdf8",
    globeColor: "#0a1224",
    globeEmissive: "#04070f",
    side: "rgba(8, 14, 28, 0.55)",
  },
  {
    id: "forest",
    name: "Earth & Forest",
    base: "rgba(52, 168, 121, 0.16)",
    hover: "rgba(250, 204, 21, 0.9)",
    selected: "rgba(251, 113, 133, 0.8)",
    languageMatch: "rgba(250, 204, 21, 0.75)",
    continentGlow: "rgba(134, 239, 172, 0.3)",
    stroke: "rgba(190, 242, 200, 0.35)",
    atmosphere: "#2dd4bf",
    globeColor: "#08160f",
    globeEmissive: "#020a06",
    side: "rgba(6, 20, 14, 0.55)",
  },
  {
    id: "vibrant",
    name: "Vibrant Multi",
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
    id: "sunset",
    name: "Warm Sunset",
    base: "rgba(217, 164, 65, 0.16)",
    hover: "rgba(251, 146, 60, 0.9)",
    selected: "rgba(220, 38, 38, 0.75)",
    languageMatch: "rgba(250, 204, 21, 0.75)",
    continentGlow: "rgba(251, 191, 36, 0.3)",
    stroke: "rgba(253, 230, 138, 0.35)",
    atmosphere: "#fb923c",
    globeColor: "#180d06",
    globeEmissive: "#0a0402",
    side: "rgba(24, 13, 6, 0.55)",
  },
];
