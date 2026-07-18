export type TimeOfDay =
  | "dawn"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

export type LocalTime = {
  hour: number;
  label: string;
  period: TimeOfDay;
  /** Something the guide would plausibly be doing right now. */
  mood: string;
};

const PERIODS: Array<{ until: number; period: TimeOfDay; mood: string }> = [
  { until: 5, period: "night", mood: "the streets are quiet" },
  { until: 8, period: "dawn", mood: "the day is just starting" },
  { until: 11, period: "morning", mood: "shops are opening up" },
  { until: 14, period: "midday", mood: "the middle of the day" },
  { until: 17, period: "afternoon", mood: "the afternoon lull" },
  { until: 21, period: "evening", mood: "people are heading home" },
  { until: 24, period: "night", mood: "the streets are quiet" },
];

/**
 * Approximate local time from longitude — 15° per hour from UTC.
 *
 * This deliberately ignores real timezone boundaries and DST. It exists to set
 * the mood of a place, not to tell the time, and in exchange it needs no API
 * key, no network call, and no timezone database.
 */
export function localTimeFromLongitude(lng: number, now = new Date()): LocalTime {
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const hour = ((utcHours + lng / 15) % 24 + 24) % 24;
  const whole = Math.floor(hour);
  const minutes = Math.floor((hour - whole) * 60);
  const { period, mood } = PERIODS.find(({ until }) => hour < until) ?? PERIODS[0];

  return {
    hour,
    label: `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    period,
    mood,
  };
}
