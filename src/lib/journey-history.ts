import type { DestinationId } from "@/lib/destinations";

// Mock persistence layer standing in for MongoDB, mirroring how session.ts
// stubs Auth0. Everything downstream depends only on the shape returned here,
// so swapping localStorage for a real collection is a change to this file.
//
// This exists now rather than later because the cultural-connection features
// in the brief ("the spice you saw in Marrakesh travelled this route") are
// queries over where a user has already been. Without a record of visits there
// is nothing to connect.

const STORAGE_KEY = "wv_journey_history_v1";
const MAX_RECORDS = 100;

export type JourneyRecord = {
  id: string;
  iso2: string;
  guideId: string;
  guideName: string;
  stops: DestinationId[];
  startedAt: string;
};

export type NewJourney = Omit<JourneyRecord, "id" | "startedAt">;

export function recordJourney(journey: NewJourney): JourneyRecord {
  const record: JourneyRecord = {
    ...journey,
    id: `${journey.iso2}-${Date.now()}`,
    startedAt: new Date().toISOString(),
  };

  const history = [record, ...getJourneyHistory()].slice(0, MAX_RECORDS);
  write(history);
  return record;
}

export function getJourneyHistory(): JourneyRecord[] {
  const raw = read();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JourneyRecord[]) : [];
  } catch {
    // Corrupt or hand-edited storage should read as "no history", never throw
    // and take the page down with it.
    return [];
  }
}

/** Countries the user has already walked, newest first. */
export function getVisitedCountries(): string[] {
  return Array.from(new Set(getJourneyHistory().map((r) => r.iso2)));
}

function read(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing and blocked-storage settings throw on access.
    return null;
  }
}

function write(history: JourneyRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Full or unavailable storage should not break the journey.
  }
}
