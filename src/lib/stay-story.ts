import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import {
  findDestination,
  type DestinationId,
} from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import type { StayListing, StayNear } from "@/lib/stay22";
import {
  vocabularyFor,
  type TaughtWord,
} from "@/lib/walk/vocabulary";
import { locationPhrase } from "@/lib/walk-variables";
import { resolveSupportedLanguage } from "@/lib/supported-languages";

export type StayStoryCard = {
  stay: StayListing;
  why: string;
  shortWhy: string;
};

export type GuestNightStory = {
  /** Walked stops + featured hotel name as the final Night stop. */
  pathLabels: string[];
  /** One-line memory when arriving from a walk. */
  walkMemory: string | null;
  ritual: string;
  greeting: TaughtWord | null;
  deskWord: TaughtWord | null;
  guideTip: string;
  featured: StayStoryCard | null;
  alternates: StayStoryCard[];
  guestStayWhy: string;
  guestStayWord: string;
};

const WALKING_MPM = 80;

const NEAR_WHY: Record<StayNear, string> = {
  market: "Close enough to hear the morning stalls opening.",
  home: "In a residential pocket — how guests actually sleep here.",
  street: "On an ordinary block, not a tourist strip.",
  school: "Near where the day starts for families here.",
  nature: "A quiet room after walking the land.",
  capital: "In the heart of the city you just met.",
  attraction: "Steps from the place this language is famous for.",
};

const RITUAL_BY_PERIOD: Record<LocalTime["period"], string> = {
  night: "People are heading home — this is when guests arrive.",
  evening: "People are heading home — this is when guests arrive.",
  dawn: "Early light — ask for a quiet courtyard room.",
  morning: "Early light — ask for a quiet courtyard room.",
  midday: "Midday quiet — a good hour to settle your bags.",
  afternoon: "The afternoon lull — check in before the evening rush.",
};

/** Real hospitality phrases for the front desk — not “house / meal”. */
const DESK_VOCAB: Record<string, TaughtWord> = {
  POR: { term: "a chave", gloss: "the key" },
  SPA: { term: "la llave", gloss: "the key" },
  FRA: { term: "la clé", gloss: "the key" },
  HIN: { term: "चाबी", roman: "cābī", gloss: "key" },
  ARA: { term: "مفتاح", roman: "miftāḥ", gloss: "key" },
  JPN: { term: "鍵", roman: "kagi", gloss: "key" },
  SWA: { term: "ufunguo", gloss: "key" },
  ENG: { term: "the key", gloss: "what opens your room" },
};

const GREETING_FALLBACK: Record<string, TaughtWord> = {
  POR: { term: "olá", gloss: "hello" },
  SPA: { term: "hola", gloss: "hello" },
  FRA: { term: "bonjour", gloss: "hello" },
  HIN: { term: "नमस्ते", roman: "namaste", gloss: "hello" },
  ARA: { term: "مرحبا", roman: "marhaban", gloss: "hello" },
  JPN: { term: "こんにちは", roman: "konnichiwa", gloss: "hello" },
  SWA: { term: "jambo", gloss: "hello" },
  ENG: { term: "hello", gloss: "a simple greeting" },
};

function footMinutes(meters: number | null): number | null {
  if (meters == null || meters <= 0 || meters > 50_000) return null;
  return Math.max(1, Math.round(meters / WALKING_MPM));
}

function langCode(languageDisplayName: string | null): string {
  return (
    resolveSupportedLanguage(languageDisplayName ?? "")?.code ?? "ENG"
  );
}

function hospitalityWords(languageDisplayName: string | null): {
  greeting: TaughtWord;
  deskWord: TaughtWord;
} {
  const code = langCode(languageDisplayName);
  const home = vocabularyFor(languageDisplayName, "home");
  const greeting =
    home?.greeting ?? GREETING_FALLBACK[code] ?? GREETING_FALLBACK.ENG;
  const deskWord = DESK_VOCAB[code] ?? DESK_VOCAB.ENG;
  return { greeting, deskWord };
}

/** Word from the last walked stop — language callback in the distance line. */
function learnedWordFromWalk(
  languageDisplayName: string | null,
  stops: DestinationId[]
): TaughtWord | null {
  if (stops.length === 0) return null;
  const last = stops[stops.length - 1];
  const vocab = vocabularyFor(languageDisplayName, last);
  return vocab?.words[0] ?? vocab?.greeting ?? null;
}

function whyForStay(
  stay: StayListing,
  near: StayNear,
  guideName: string,
  learnedWord: TaughtWord | null,
  fromWalk: boolean
): { why: string; shortWhy: string } {
  const base = NEAR_WHY[near];
  const mins = footMinutes(stay.distanceMeters);
  const parts: string[] = [];

  if (fromWalk) {
    parts.push(`End of the route you walked with ${guideName}.`);
  }
  parts.push(base);

  if (mins != null) {
    const wordBit = learnedWord
      ? ` from where you learned “${learnedWord.term}”`
      : "";
    parts.push(
      `About ${mins} minute${mins === 1 ? "" : "s"} on foot${wordBit}.`
    );
  }

  const why = parts.join(" ");
  const shortWhy =
    mins != null
      ? `~${mins} min walk · ${base.replace(/\.$/, "")}`
      : base.replace(/\.$/, "");

  return { why, shortWhy };
}

/**
 * Cultural layer around Stay22 listings — never persisted, rebuilt each view.
 */
export function buildStayStory(input: {
  country: CountryInfo;
  guide: AgentIdentity;
  stays: StayListing[];
  stops: DestinationId[];
  near: StayNear;
  localTime: LocalTime;
  languageDisplayName: string | null;
  fromWalk?: boolean;
}): GuestNightStory {
  const route =
    input.stops.length > 0
      ? input.stops
      : (["market", "home", "street"] as DestinationId[]);

  const fromWalk = Boolean(input.fromWalk || input.stops.length > 0);
  const { greeting, deskWord } = hospitalityWords(input.languageDisplayName);
  const learnedWord = learnedWordFromWalk(
    input.languageDisplayName,
    input.stops.length > 0 ? input.stops : route
  );
  const ritual = RITUAL_BY_PERIOD[input.localTime.period];

  const cards: StayStoryCard[] = input.stays.map((stay) => {
    const { why, shortWhy } = whyForStay(
      stay,
      input.near,
      input.guide.name,
      learnedWord,
      fromWalk
    );
    return { stay, why, shortWhy };
  });

  const featured = cards[0] ?? null;
  const alternates = cards.slice(1, 3);

  // Night stop = live hotel name when we have a featured stay.
  const nightLabel = featured?.stay.name ?? "Night";
  const pathLabels = [
    ...route.map((id) => findDestination(id)?.label ?? locationPhrase(id)),
    nightLabel,
  ];

  const walkLabels = route.map(
    (id) => findDestination(id)?.label ?? locationPhrase(id)
  );
  const walkMemory =
    fromWalk && walkLabels.length > 0
      ? `You walked ${walkLabels.join(" → ")}. Tonight closes the route.`
      : null;

  const guideTip = featured
    ? `${input.guide.name}: If you stay at ${featured.stay.name}, greet them with “${greeting.term}” and ask for “${deskWord.term}”${deskWord.roman ? ` (${deskWord.roman})` : ""}. They’re near ${featured.stay.area || input.country.capital}.`
    : `${input.guide.name}: A guest night here means sleeping near the places you walked.`;

  return {
    pathLabels,
    walkMemory,
    ritual,
    greeting,
    deskWord,
    guideTip,
    featured,
    alternates,
    guestStayWhy: featured?.why ?? ritual,
    guestStayWord: `${deskWord.term}${deskWord.roman ? ` (${deskWord.roman})` : ""} — ${deskWord.gloss}`,
  };
}
