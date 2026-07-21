"use client";

import { useCallback, useState } from "react";
import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import type { DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import { pickWalkLanguage } from "@/lib/elevenlabs-language";
import {
  buildWalkDynamicVariables,
  locationPhrase,
  resolveSceneId,
} from "@/lib/walk-variables";
import { stripAudioTags } from "@/lib/elevenlabs-transcript";
import { buildStayStory } from "@/lib/stay-story";
import type { StayListing, StayNear } from "@/lib/stay22";

type WalkVoiceProps = {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  localTime: LocalTime;
  /** Move the 3D photosphere when the agent calls show_scene. */
  onShowScene?: (stop: DestinationId) => boolean;
};

/** Live ElevenLabs teaching panel for the 3D walk (center-bottom). */
export default function WalkVoice(props: WalkVoiceProps) {
  return (
    <ConversationProvider
      onError={(message) => console.error("ElevenLabs walk error:", message)}
    >
      <WalkVoiceInner {...props} />
    </ConversationProvider>
  );
}

function WalkVoiceInner({
  country,
  guide,
  stops,
  localTime,
  onShowScene,
}: WalkVoiceProps) {
  const conversation = useConversation();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [lines, setLines] = useState<Array<{ role: string; text: string }>>([]);

  const language = pickWalkLanguage(country.languages);
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting" || starting;

  useConversationClientTool(
    "show_scene",
    (parameters: { scene_id?: string; location?: string }) => {
      const raw = parameters.scene_id ?? parameters.location ?? "";
      const next = resolveSceneId(raw, stops);
      if (!next) return `Unknown scene "${raw}" — staying put`;
      const moved = onShowScene?.(next) ?? false;
      return moved
        ? `Now at ${locationPhrase(next)}`
        : `Already at ${locationPhrase(next)} (or still walking)`;
    }
  );

  const appendLine = useCallback((role: string, text: string) => {
    const cleaned =
      role === "guide" ? stripAudioTags(text) : text.trim();
    if (!cleaned) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === cleaned) return prev;
      return [...prev.slice(-40), { role, text: cleaned }];
    });
  }, []);

  const startVoice = async () => {
    setError(null);
    setStarting(true);
    setLines([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/elevenlabs/token");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not start the voice guide");
      }

      const bodyJson = (await res.json()) as {
        token?: string;
        userId?: string;
      };
      const { token, userId } = bodyJson;

      if (!token) {
        throw new Error("No conversation token returned");
      }

      const near = stops.includes("home")
        ? "home"
        : stops[0] ?? "capital";
      let guestStay: {
        name?: string;
        area?: string;
        hint?: string;
        why?: string;
        word?: string;
      } | null = null;
      try {
        const staysRes = await fetch(
          `/api/stays?iso2=${encodeURIComponent(country.iso2)}&near=${near}`
        );
        if (staysRes.ok) {
          const staysBody = (await staysRes.json()) as {
            stays?: StayListing[];
          };
          const listings = staysBody.stays ?? [];
          const first = listings[0];
          if (first) {
            const story = buildStayStory({
              country,
              guide,
              stays: listings,
              stops,
              near: near as StayNear,
              localTime,
              languageDisplayName: language.displayName,
              fromWalk: true,
            });
            guestStay = {
              name: first.name,
              area: first.area,
              hint: first.hint,
              why: story.guestStayWhy,
              word: story.guestStayWord,
            };
          }
        }
      } catch {
        /* stays are optional for the walk voice session */
      }

      const dynamicVariables = buildWalkDynamicVariables({
        country,
        guide,
        stops,
        language,
        localTime,
        guestStay,
      });

      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        userId,
        dynamicVariables,
        onConnect: () => setStarting(false),
        onMessage: ({ message, role }) => {
          appendLine(role === "agent" ? "guide" : "you", message);
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start the voice guide";
      setError(message);
      setStarting(false);
    }
  };

  const endVoice = () => conversation.endSession();
  const latestGuide = [...lines].reverse().find((l) => l.role === "guide");

  return (
    <div className="pointer-events-auto w-full max-w-xl">
      <div className="rounded-2xl border border-white/10 bg-[#05070d]/88 p-5 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/70">
          {guide.name} · {language.displayName}
        </p>

        {error && (
          <p className="mt-2 font-mono text-xs text-rose-300/90">{error}</p>
        )}

        {!connected ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-zinc-300">
              Talk with {guide.name} as you walk — they&apos;ll teach as you go.
            </p>
            <button
              type="button"
              onClick={startVoice}
              disabled={connecting}
              className="mt-4 rounded-full bg-sky-400/90 px-5 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting ? "connecting…" : `start talking with ${guide.name}`}
            </button>
          </div>
        ) : (
          <>
            {latestGuide ? (
              <p className="mt-3 text-base leading-relaxed text-zinc-100">
                {latestGuide.text}
              </p>
            ) : (
              <p className="mt-3 font-mono text-[11px] text-zinc-500">
                {conversation.isSpeaking
                  ? `${guide.name} is speaking…`
                  : conversation.isListening
                    ? "listening — your turn"
                    : "connected"}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={endVoice}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] text-zinc-200 transition-colors hover:bg-white/10"
              >
                end voice
              </button>
              <button
                type="button"
                onClick={() => conversation.setMuted(!conversation.isMuted)}
                className="rounded-full border border-white/10 px-3.5 py-2 font-mono text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                {conversation.isMuted ? "unmute" : "mute"}
              </button>
              <span className="self-center font-mono text-[10px] text-zinc-500">
                {conversation.isSpeaking
                  ? `${guide.name} speaking…`
                  : conversation.isListening
                    ? "your turn"
                    : "connected"}
              </span>
            </div>

            {lines.length > 1 && (
              <ul className="mt-4 max-h-28 space-y-1.5 overflow-y-auto border-t border-white/5 pt-3">
                {lines.slice(-5, -1).map((line, i) => (
                  <li key={`${i}-${line.role}`} className="text-xs">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                      {line.role === "guide" ? guide.name : "you"}
                    </span>
                    <p className="text-zinc-400">{line.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
