import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import {
  findDestination,
  type DestinationId,
} from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import type { WalkLanguage } from "@/lib/elevenlabs-language";

/** Phrases that match how the ElevenLabs agent prompt refers to places. */
const LOCATION_TYPE_BY_STOP: Record<DestinationId, string> = {
  market: "the spice market",
  home: "a family kitchen",
  school: "the walk to school",
  nature: "a nature walk",
  street: "the neighborhood street",
};

export type WalkDynamicVariables = {
  character_name: string;
  region_name: string;
  target_language: string;
  location_type: string;
  time_of_day: string;
  season_or_weather: string;
  proficiency_level: string;
  is_regional_holiday: string;
};

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
  const firstStop = input.stops[0];
  const destination = firstStop ? findDestination(firstStop) : null;
  const locationType =
    (firstStop && LOCATION_TYPE_BY_STOP[firstStop]) ||
    destination?.label.toLowerCase() ||
    "the street";

  const holiday = input.isRegionalHoliday;
  const holidayValue =
    typeof holiday === "string"
      ? holiday
      : holiday
        ? "yes"
        : "no";

  return {
    character_name: input.guide.name,
    region_name: `${input.country.capital}, ${input.country.name}`,
    target_language: input.language.displayName,
    location_type: locationType,
    time_of_day: `${input.localTime.period} (${input.localTime.label}) — ${input.localTime.mood}`,
    season_or_weather: input.seasonOrWeather ?? "typical for the season",
    proficiency_level: input.proficiencyLevel ?? "beginner",
    is_regional_holiday: holidayValue,
  };
}
