export type ConflictSeverity = "low" | "medium" | "high";

export type ConflictHotspot = {
  location: string;
  events: number;
  fatalities: number;
  topEventType: string | null;
  lat: number | null;
  lng: number | null;
};

export type CountryConflict = {
  iso2: string;
  totalEvents: number;
  totalFatalities: number;
  eventTypeCounts: Record<string, number>;
  severity: ConflictSeverity;
  summary: string;
  hotspots: ConflictHotspot[];
};

export type ConflictData = {
  generatedAt: string;
  asOf: string;
  windowDays: number;
  countries: Record<string, CountryConflict>;
};

export const SEVERITY_COLOR: Record<ConflictSeverity, string> = {
  low: "#facc15",
  medium: "#fb923c",
  high: "#ef4444",
};
