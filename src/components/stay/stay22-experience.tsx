"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import type { DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import type { StayListing, StayNear } from "@/lib/stay22";
import { pickWalkLanguage } from "@/lib/elevenlabs-language";
import { buildWalkDynamicVariables } from "@/lib/walk-variables";
import { stripAudioTags } from "@/lib/elevenlabs-transcript";
import { buildStayStory } from "@/lib/stay-story";
import type { TaughtWord } from "@/lib/walk/vocabulary";

type Stay22ExperienceProps = {
  country: CountryInfo;
  guide: AgentIdentity;
  localTime: LocalTime;
  near: StayNear;
  language: string | null;
  stops: DestinationId[];
  from: "walk" | "globe" | null;
};

export default function Stay22Experience(props: Stay22ExperienceProps) {
  return (
    <ConversationProvider
      onError={(message) => console.error("ElevenLabs stay error:", message)}
    >
      <Stay22Inner {...props} />
    </ConversationProvider>
  );
}

function WordChip({
  label,
  word,
}: {
  label: string;
  word: TaughtWord;
}) {
  return (
    <div className="inline-flex flex-col gap-0.5 border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-zinc-100">
        <span className="font-medium">{word.term}</span>
        {word.roman && (
          <span className="text-zinc-400"> · {word.roman}</span>
        )}
        <span className="text-zinc-500"> — {word.gloss}</span>
      </p>
    </div>
  );
}

function Stay22Inner({
  country,
  guide,
  localTime,
  near,
  language: languageParam,
  stops,
  from,
}: Stay22ExperienceProps) {
  const conversation = useConversation();
  const [stays, setStays] = useState<StayListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [line, setLine] = useState<string | null>(null);

  const walkLanguage = pickWalkLanguage(
    languageParam ? [languageParam, ...country.languages] : country.languages
  );
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting" || starting;

  const story = useMemo(
    () =>
      buildStayStory({
        country,
        guide,
        stays,
        stops,
        near,
        localTime,
        languageDisplayName: walkLanguage.displayName,
        fromWalk: from === "walk",
      }),
    [country, from, guide, localTime, near, stays, stops, walkLanguage.displayName]
  );

  const featured = story.featured;
  const bookHref = featured?.stay.deeplink ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      iso2: country.iso2,
      near,
    });
    if (languageParam) params.set("lang", languageParam);

    fetch(`/api/stays?${params}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          stays?: StayListing[];
          error?: string;
        } | null;
        if (!res.ok) throw new Error(body?.error ?? "Could not load stays");
        if (!cancelled) setStays(body?.stays ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load stays");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country.iso2, near, languageParam]);

  const startVoice = useCallback(async () => {
    setVoiceError(null);
    setStarting(true);
    setLine(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/elevenlabs/token");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not start the guide");
      }
      const { token, userId } = (await res.json()) as {
        token?: string;
        userId?: string;
      };
      if (!token) throw new Error("No conversation token returned");

      const routeStops =
        stops.length > 0 ? stops : (["market", "home", "street"] as DestinationId[]);

      // Night destination = live Stay22 room (not the first walk stop).
      // ElevenLabs dashboard: night first message should use
      // {{guest_stay_name}} / {{guest_stay_why}} / {{guest_stay_word}}.
      const stayHere = featured
        ? `${featured.stay.name}${featured.stay.area ? ` (${featured.stay.area})` : ""}`
        : `a guesthouse for the night in ${country.capital}`;

      const dynamicVariables = buildWalkDynamicVariables({
        country,
        guide,
        stops: routeStops,
        language: walkLanguage,
        localTime,
        currentLocation: stayHere,
        guestStay: featured
          ? {
              name: featured.stay.name,
              area: featured.stay.area,
              hint: featured.stay.hint,
              why: story.guestStayWhy,
              word: story.guestStayWord,
            }
          : {
              why: story.guestStayWhy,
              word: story.guestStayWord,
            },
      });

      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        userId,
        dynamicVariables,
        onConnect: () => setStarting(false),
        onMessage: ({ message, role }) => {
          if (role !== "agent") return;
          const cleaned = stripAudioTags(message);
          if (cleaned) setLine(cleaned);
        },
        onError: (message) => setVoiceError(message),
      });
    } catch (err) {
      setVoiceError(
        err instanceof Error ? err.message : "Could not start the guide"
      );
      setStarting(false);
    }
  }, [
    conversation,
    country,
    featured,
    guide,
    localTime,
    stops,
    story.guestStayWhy,
    story.guestStayWord,
    walkLanguage,
  ]);

  const endVoice = () => conversation.endSession();

  return (
    <main className="min-h-screen w-full bg-[#05070d] px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/explore"
            className="font-mono text-sm font-medium tracking-tight text-zinc-200 transition-colors hover:text-white"
          >
            worldview
          </Link>
          <Link
            href={`/explore/${country.iso2}/journey${
              guide ? `?guide=${guide.id}` : ""
            }`}
            className="font-mono text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← back to walk plan
          </Link>
        </div>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
          {country.continent} · {country.name}
          {from === "walk" ? " · after your walk" : ""} · guest night
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
          Sleep where you walked
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          {guide.name} hands you a dossier for the night — not a hotel search.
        </p>

        {/* Walk → hotel path strip (night = live listing name) */}
        <nav
          aria-label="Walk to night"
          className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]"
        >
          {story.pathLabels.map((label, i) => {
            const isNight = i === story.pathLabels.length - 1;
            return (
              <span
                key={`${label}-${i}`}
                className="guest-path-step flex items-center gap-2"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {i > 0 && <span className="text-zinc-700">→</span>}
                <span
                  className={
                    isNight ? "text-sky-300" : "text-zinc-600"
                  }
                >
                  {isNight ? label : label.toLowerCase()}
                </span>
              </span>
            );
          })}
        </nav>

        {story.walkMemory && (
          <p className="guest-ritual mt-3 max-w-xl text-sm text-zinc-500">
            {story.walkMemory}
          </p>
        )}

        {/* Local-time ritual */}
        <div className="guest-ritual mt-6 border-l border-sky-400/40 pl-4">
          <p className="font-mono text-[11px] text-sky-300/80">
            {localTime.label} · {country.capital}
          </p>
          <p className="mt-1 text-sm text-zinc-300">{story.ritual}</p>
        </div>

        <section className="mt-10">
          <p className="font-mono text-xs text-zinc-500">
            tonight · {walkLanguage.displayName}
          </p>

          {loading && (
            <p className="mt-6 font-mono text-xs text-zinc-500">
              finding a room for guests…
            </p>
          )}
          {error && (
            <p className="mt-6 font-mono text-xs text-rose-300/90">{error}</p>
          )}

          {!loading && !error && stays.length === 0 && (
            <p className="mt-6 text-sm text-zinc-400">
              No stays turned up just now — try again in a moment.
            </p>
          )}

          {featured && (
            <article className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {featured.stay.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.stay.thumbnail}
                  alt=""
                  className="h-52 w-full object-cover sm:h-64"
                />
              )}
              <div className="p-5 sm:p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/70">
                  {guide.name} suggests
                </p>
                <h2 className="mt-2 font-serif text-2xl text-zinc-50 sm:text-3xl">
                  {featured.stay.name}
                </h2>
                {featured.stay.area && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {featured.stay.area}
                  </p>
                )}

                <p className="guest-why mt-5 font-serif text-lg leading-relaxed text-zinc-200">
                  {featured.why}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {story.greeting && (
                    <WordChip label="greet them" word={story.greeting} />
                  )}
                  {story.deskWord && (
                    <WordChip
                      label="say this at the desk"
                      word={story.deskWord}
                    />
                  )}
                </div>

                <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                  {story.guideTip}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={featured.stay.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-sky-400/90 px-6 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300"
                  >
                    book this night →
                  </a>
                  {featured.stay.hint && (
                    <span className="font-mono text-[10px] text-zinc-600">
                      {featured.stay.hint}
                    </span>
                  )}
                </div>
              </div>
            </article>
          )}

          {story.alternates.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                other rooms tonight
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {story.alternates.map(({ stay, shortWhy }) => (
                  <li key={stay.id}>
                    <a
                      href={stay.deeplink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-sky-400/30 hover:bg-sky-400/[0.04]"
                    >
                      <p className="text-sm text-zinc-100">{stay.name}</p>
                      <p className="mt-2 font-serif text-sm leading-snug text-zinc-400">
                        {shortWhy}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/70">
            ask {guide.name}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Hear how locals talk about staying the night — then book the same
            room on this page (Stay22 commission stays on).
          </p>

          {voiceError && (
            <p className="mt-3 font-mono text-xs text-rose-300/90">{voiceError}</p>
          )}
          {line && (
            <p className="mt-4 text-base leading-relaxed text-zinc-100">{line}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!connected ? (
              <button
                type="button"
                onClick={startVoice}
                disabled={connecting || loading}
                className="rounded-full bg-sky-400/90 px-5 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting
                  ? "connecting…"
                  : `talk about tonight with ${guide.name}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={endVoice}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs text-zinc-200 transition-colors hover:bg-white/10"
              >
                end voice
              </button>
            )}
            {bookHref && (
              <a
                href={bookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-sky-400/40 px-5 py-2.5 font-mono text-xs text-sky-300 transition-colors hover:border-sky-300 hover:text-sky-200"
              >
                book the room they named →
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
