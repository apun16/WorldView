import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import {
  findDestination,
  type DestinationId,
} from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import type { WalkLanguage } from "@/lib/elevenlabs-language";

/**
 * Phrases for the ElevenLabs agent prompt.
 * Keys double as scene_id values for the show_scene client tool.
 */
export const LOCATION_PHRASE_BY_STOP: Record<DestinationId, string> = {
  market: "the spice market",
  home: "a family home",
  school: "the walk to school",
  nature: "a nature walk",
  street: "the neighborhood street",
};

export type WalkDynamicVariables = {
  character_name: string;
  region_name: string;
  target_language: string;
  /** Full route, e.g. "the spice market, a family home, the walk to school" */
  location_sequence: string;
  /** First stop — start of the sequence. Agent tracks further progress itself. */
  current_location: string;
  /**
   * Same as current_location for now — the live agent first_message still
   * references {{location_type}}, so omitting it aborts the WebRTC session.
   */
  location_type: string;
  time_of_day: string;
  season_or_weather: string;
  proficiency_level: string;
  is_regional_holiday: string;
};

export function locationPhrase(stop: DestinationId): string {
  return (
    LOCATION_PHRASE_BY_STOP[stop] ??
    findDestination(stop)?.label.toLowerCase() ??
    stop
  );
}

/**
 * Resolve a show_scene scene_id (destination id or phrase) to a DestinationId.
 */
export function resolveSceneId(
  sceneId: string,
  stops: DestinationId[]
): DestinationId | null {
  const normalized = sceneId.trim().toLowerCase();
  const byId = stops.find((s) => s === normalized);
  if (byId) return byId;

  for (const stop of stops) {
    if (LOCATION_PHRASE_BY_STOP[stop].toLowerCase() === normalized) {
      return stop;
    }
  }

  for (const stop of stops) {
    const label = findDestination(stop)?.label.toLowerCase();
    if (label && (label === normalized || normalized.includes(stop))) {
      return stop;
    }
  }

  return null;
}

/**
 * Session vars for the ElevenLabs agent template.
 * Weather / proficiency / holidays use placeholders until those services are wired.
 */
export function buildWalkDynamicVariables(input: {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  language: WalkLanguage;
  localTime: LocalTime;
  /** From OpenWeather later. */
  seasonOrWeather?: string;
  /** From Mongo conversation history later. */
  proficiencyLevel?: string;
  /** From a holiday calendar later. */
  isRegionalHoliday?: boolean | string;
}): WalkDynamicVariables {
  const phrases = input.stops.map(locationPhrase);
  const current = phrases[0] ?? "the neighborhood street";

  const holiday = input.isRegionalHoliday;
  const holidayValue =
    typeof holiday === "string"
      ? holiday
      : holiday
        ? "true"
        : "false";

  return {
    character_name: input.guide.name,
    region_name: `${input.country.capital}, ${input.country.name}`,
    target_language: input.language.displayName,
    location_sequence: phrases.join(", "),
    current_location: current,
    location_type: current,
    time_of_day: `${input.localTime.period} (${input.localTime.label}) — ${input.localTime.mood}`,
    season_or_weather: input.seasonOrWeather ?? "typical for the season",
    proficiency_level: input.proficiencyLevel ?? "beginner",
    is_regional_holiday: holidayValue,
  };
}
