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

type WalkVoiceProps = {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  localTime: LocalTime;
};

/** Live voice companion for the 3D walk — sits alongside the scripted
 *  advance-by-button scene, so you can talk to the guide about wherever
 *  you currently are while still driving the walk yourself. */
export default function WalkVoice(props: WalkVoiceProps) {
  return (
    <ConversationProvider
      onError={(message) => console.error("ElevenLabs walk error:", message)}
    >
      <WalkVoiceInner {...props} />
    </ConversationProvider>
  );
}

function WalkVoiceInner({ country, guide, stops, localTime }: WalkVoiceProps) {
  const conversation = useConversation();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [lines, setLines] = useState<Array<{ role: string; text: string }>>([]);

  const language = pickWalkLanguage(country.languages);
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting" || starting;

  // Agent calls this to acknowledge where it thinks you are; the scripted
  // walk still drives actual scene changes via the "walk to X" button.
  useConversationClientTool(
    "show_scene",
    (parameters: { scene_id?: string; location?: string }) => {
      const raw = parameters.scene_id ?? parameters.location ?? "";
      const next = resolveSceneId(raw, stops);
      return next
        ? `Now at ${locationPhrase(next)}`
        : `Unknown scene "${raw}" — staying put`;
    }
  );

  const appendLine = useCallback((role: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === trimmed) return prev;
      return [...prev.slice(-40), { role, text: trimmed }];
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

      const { signedUrl, userId } = (await res.json()) as {
        signedUrl: string;
        userId?: string;
      };

      const dynamicVariables = buildWalkDynamicVariables({
        country,
        guide,
        stops,
        language,
        localTime,
      });

      conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        userId,
        dynamicVariables,
        onMessage: ({ message, role }) => {
          appendLine(role === "agent" ? "guide" : "you", message);
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start the voice guide";
      setError(message);
    } finally {
      setStarting(false);
    }
  };

  const endVoice = () => conversation.endSession();

  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 z-20 w-72 max-w-[calc(100vw-2.5rem)] sm:left-8">
      <div className="rounded-xl border border-white/10 bg-[#070a14]/88 p-4 backdrop-blur-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          voice guide · {language.displayName}
        </p>

        {error && (
          <p className="mt-2 font-mono text-xs text-rose-300/90">{error}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={startVoice}
              disabled={connecting}
              className="rounded-full bg-sky-400/90 px-4 py-2 font-mono text-[11px] text-[#05070d] transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting ? "connecting…" : `talk to ${guide.name}`}
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>

        {connected && (
          <p className="mt-3 font-mono text-[10px] text-zinc-500">
            {conversation.isSpeaking
              ? `${guide.name} is speaking…`
              : conversation.isListening
                ? "listening — your turn"
                : "connected"}
          </p>
        )}

        {lines.length > 0 && (
          <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto border-t border-white/5 pt-3">
            {lines.slice(-6).map((line, i) => (
              <li key={`${i}-${line.role}`} className="text-xs">
                <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                  {line.role === "guide" ? guide.name : "you"}
                </span>
                <p className="text-zinc-300">{line.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
