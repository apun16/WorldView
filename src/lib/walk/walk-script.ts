import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import { findDestination, type DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import { seededRandom } from "@/lib/seeded-random";
import { vocabularyFor, type TaughtWord } from "@/lib/walk/vocabulary";

export type GuideState = "idle" | "walking" | "speaking" | "gesturing";

/** Where the guide draws your attention, in spherical coords so this module
 *  stays free of three.js and remains node-testable. */
export type LookTarget = { azimuth: number; elevation: number };

export type DialogueBeat = {
  id: string;
  text: string;
  word?: TaughtWord;
  look?: LookTarget;
  guideState: GuideState;
};

export type WalkStop = {
  destination: DestinationId;
  title: string;
  beats: DialogueBeat[];
  /** Anchor points the guide walks between, as [x, y, z] in metres. */
  path: Array<[number, number, number]>;
};

export type WalkScript = {
  stops: WalkStop[];
  /** Null when we have no vocabulary for the chosen language. */
  language: string | null;
};

const ARRIVAL_LINES: Record<DestinationId, string> = {
  market: "This is where everyone comes in the morning. Mind the crates.",
  home: "Come in — leave your shoes by the door, like everyone does here.",
  school: "That bell just went. You can hear them through the windows.",
  nature: "Out here it goes quiet. This is where people walk to think.",
  street: "Just our street. Nothing special — which is the point.",
};

const CLOSING_LINES: Record<DestinationId, string> = {
  market: "You'd get by here now. That's more than most visitors manage.",
  home: "You'd be fed twice over if you stayed. That's how it works.",
  school: "They learn the same way you just did — by repeating it badly first.",
  nature: "People come out here their whole lives and never run out of names for it.",
  street: "Now you've walked it, it isn't a strange street any more.",
};

export function buildWalkScript(
  country: CountryInfo,
  guide: AgentIdentity,
  stops: DestinationId[],
  localTime: LocalTime,
  language: string | null
): WalkScript {
  let resolvedLanguage: string | null = null;

  const built = stops.map((destination, index) => {
    const vocab = vocabularyFor(language, destination);
    if (vocab) resolvedLanguage = vocab.language;

    return buildStop({
      country,
      guide,
      destination,
      localTime,
      vocab,
      isFirst: index === 0,
      isLast: index === stops.length - 1,
    });
  });

  return { stops: built, language: resolvedLanguage };
}

function buildStop({
  country,
  guide,
  destination,
  localTime,
  vocab,
  isFirst,
  isLast,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  destination: DestinationId;
  localTime: LocalTime;
  vocab: ReturnType<typeof vocabularyFor>;
  isFirst: boolean;
  isLast: boolean;
}): WalkStop {
  const info = findDestination(destination);
  const label = info?.label ?? destination;
  const rand = seededRandom(country.iso2, destination, guide.id);
  const beats: DialogueBeat[] = [];

  const push = (beat: Omit<DialogueBeat, "id">) =>
    beats.push({ ...beat, id: `${destination}-${beats.length}` });

  if (isFirst) {
    push({
      text: `I'm ${guide.name}. It's ${localTime.label} here in ${country.capital} — ${localTime.mood}. Walk with me.`,
      guideState: "speaking",
    });
    if (vocab) {
      push({
        text: `First, how we say hello. Try it.`,
        word: vocab.greeting,
        guideState: "gesturing",
      });
    }
  }

  push({ text: ARRIVAL_LINES[destination], guideState: "walking" });

  if (vocab) {
    for (const word of vocab.words) {
      push({
        text: `You'll need this one.`,
        word,
        look: randomLook(rand),
        guideState: "gesturing",
      });
    }
  } else {
    // No vocabulary for this language — the walk still has something to say.
    push({
      text: `${info?.tagline ?? "There's a lot to take in here."}`,
      look: randomLook(rand),
      guideState: "gesturing",
    });
  }

  push({
    text: isLast
      ? `${CLOSING_LINES[destination]} That's the walk — thank you for coming.`
      : CLOSING_LINES[destination],
    guideState: "speaking",
  });

  return { destination, title: label, beats, path: buildPath(rand) };
}

/** A short loop in front of the user for the guide to walk. Kept in front
 *  (azimuth biased toward the camera's forward) so they never talk from
 *  behind your head. */
function buildPath(rand: () => number): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  const count = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i++) {
    const spread = (i / Math.max(count - 1, 1) - 0.5) * Math.PI * 0.9;
    const radius = 2.6 + rand() * 2.4;
    points.push([Math.sin(spread) * radius, 0, -Math.cos(spread) * radius]);
  }
  return points;
}

function randomLook(rand: () => number): LookTarget {
  return {
    azimuth: (rand() - 0.5) * Math.PI * 1.2,
    elevation: (rand() - 0.35) * 0.5,
  };
}
