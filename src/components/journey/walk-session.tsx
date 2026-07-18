"use client";

import { useCallback, useState } from "react";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import type { DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import { pickWalkLanguage } from "@/lib/elevenlabs-language";
import { buildWalkDynamicVariables } from "@/lib/walk-variables";

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
  const [lines, setLines] = useState<Array<{ role: string; text: string }>>(
    []
  );

  const language = pickWalkLanguage(country.languages);
  const connected = conversation.status === "connected";
  const connecting =
    conversation.status === "connecting" || starting;

  const appendLine = useCallback((role: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === trimmed) return prev;
      return [...prev.slice(-40), { role, text: trimmed }];
    });
  }, []);

  const startWalk = async () => {
    setError(null);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/elevenlabs/token");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not start the walk");
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

      // Let the ElevenLabs agent prompt/first message use {{vars}}.
      // Avoid prompt overrides so dashboard templates keep working.
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
        err instanceof Error ? err.message : "Could not start the walk";
      setError(message);
    } finally {
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
        {guide.name} will speak with you as you walk. Allow the microphone when
        prompted.
        {!language.supported && (
          <span className="mt-1 block text-amber-200/70">
            This language is still rolling out — the guide may lean on English.
          </span>
        )}
      </p>

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

      {connected && (
        <p className="mt-4 font-mono text-[11px] text-zinc-500">
          {conversation.isSpeaking
            ? `${guide.name} is speaking…`
            : conversation.isListening
              ? "listening — your turn"
              : "connected"}
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
