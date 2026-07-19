"use client";

import { useCallback, useState } from "react";
import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import {
  findDestination,
  type DestinationId,
} from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import { pickWalkLanguage } from "@/lib/elevenlabs-language";
import {
  buildWalkDynamicVariables,
  locationPhrase,
  resolveSceneId,
} from "@/lib/walk-variables";
import { stripAudioTags } from "@/lib/elevenlabs-transcript";

type WalkSessionProps = {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  localTime: LocalTime;
};

export default function WalkSession(props: WalkSessionProps) {
  return (
    <ConversationProvider
      onError={(message) => console.error("ElevenLabs walk error:", message)}
    >
      <WalkSessionInner {...props} />
    </ConversationProvider>
  );
}

function WalkSessionInner({
  country,
  guide,
  stops,
  localTime,
}: WalkSessionProps) {
  const conversation = useConversation();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [activeStop, setActiveStop] = useState<DestinationId>(stops[0]);
  const [lines, setLines] = useState<Array<{ role: string; text: string }>>(
    []
  );

  const language = pickWalkLanguage(country.languages);
  const connected = conversation.status === "connected";
  const connecting =
    conversation.status === "connecting" || starting;

  useConversationClientTool(
    "show_scene",
    (parameters: { scene_id?: string; location?: string }) => {
      const raw = parameters.scene_id ?? parameters.location ?? "";
      const next = resolveSceneId(raw, stops);
      if (next) {
        setActiveStop(next);
        return `Now at ${locationPhrase(next)}`;
      }
      return `Unknown scene "${raw}" — staying put`;
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

  const startWalk = async () => {
    setError(null);
    setStarting(true);
    setActiveStop(stops[0]);
    setLines([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/elevenlabs/token");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not start the walk");
      }

      const { token, userId } = (await res.json()) as {
        token: string;
        userId?: string;
      };

      if (!token) {
        throw new Error("No conversation token returned");
      }

      const dynamicVariables = buildWalkDynamicVariables({
        country,
        guide,
        stops,
        language,
        localTime,
      });

      // Voice agents require WebRTC + conversationToken (not signed WebSocket URL).
      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        userId,
        dynamicVariables,
        onConnect: () => setStarting(false),
        onDisconnect: (details) => {
          if (details.reason === "error") {
            setError(details.message || "Disconnected from the guide");
          }
        },
        onMessage: ({ message, role }) => {
          appendLine(role === "agent" ? "guide" : "you", message);
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start the walk";
      setError(message);
      setStarting(false);
    }
  };

  const endWalk = () => {
    conversation.endSession();
  };

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        voice walk · {language.displayName}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {guide.name} will walk you through{" "}
        <span className="text-zinc-300">
          {stops.map(locationPhrase).join(" → ")}
        </span>
        . Allow the microphone when prompted.
      </p>

      {connected && (
        <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
          {stops.map((id, index) => {
            const dest = findDestination(id);
            const here = id === activeStop;
            return (
              <li key={id} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 font-mono text-[11px] ${
                    here
                      ? "bg-sky-400/20 text-sky-100"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {dest?.label ?? id}
                </span>
                {index < stops.length - 1 && (
                  <span className="text-zinc-700">→</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <p className="mt-3 font-mono text-xs text-rose-300/90">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={startWalk}
            disabled={connecting}
            className="rounded-full bg-sky-400/90 px-5 py-2.5 font-mono text-xs text-[#05070d] transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? "connecting…" : "enter the walk"}
          </button>
        ) : (
          <button
            type="button"
            onClick={endWalk}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs text-zinc-200 transition-colors hover:bg-white/10"
          >
            end walk
          </button>
        )}

        {connected && (
          <button
            type="button"
            onClick={() => conversation.setMuted(!conversation.isMuted)}
            className="rounded-full border border-white/10 px-4 py-2.5 font-mono text-xs text-zinc-400 hover:text-zinc-200"
          >
            {conversation.isMuted ? "unmute mic" : "mute mic"}
          </button>
        )}
      </div>

      {(connected || connecting) && (
        <p className="mt-4 font-mono text-[11px] text-zinc-500">
          {connecting && !connected
            ? "connecting to ElevenLabs…"
            : `now at ${locationPhrase(activeStop)} · ${
                conversation.isSpeaking
                  ? `${guide.name} is speaking…`
                  : conversation.isListening
                    ? "listening — your turn"
                    : "connected"
              }`}
        </p>
      )}

      {lines.length > 0 && (
        <ul className="mt-5 max-h-56 space-y-2 overflow-y-auto border-t border-white/5 pt-4">
          {lines.map((line, i) => (
            <li key={`${i}-${line.role}`} className="text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {line.role === "guide" ? guide.name : "you"}
              </span>
              <p className="text-zinc-300">{line.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
