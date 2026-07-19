"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import type { DestinationId } from "@/lib/destinations";
import type { LocalTime } from "@/lib/local-time";
import type { WalkScript } from "@/lib/walk/walk-script";
import { WalkEngine, type WalkPhase } from "@/components/walk/walk-engine";
import { LookControls } from "@/components/walk/look-controls";
import WalkOverlay from "@/components/walk/walk-overlay";
import WalkVoice from "@/components/walk/walk-voice";

// Capability checks are environment reads, not React state — useSyncExternalStore
// is the sanctioned way to do them without a setState-in-effect cascade, and it
// gives an explicit server snapshot so hydration cannot disagree.
const neverChanges = () => () => {};

let webglCache: boolean | null = null;
function detectWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    );
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export default function WalkExperience({
  country,
  guide,
  stops,
  script,
  accentColor,
  streetCredit,
  localTime,
}: {
  country: CountryInfo;
  guide: AgentIdentity;
  stops: DestinationId[];
  script: WalkScript;
  accentColor: string;
  /** Mapillary photographer, credited when their image is on screen (CC BY-SA). */
  streetCredit?: string | null;
  /** Computed on the server so hydration cannot disagree about the hour. */
  localTime: LocalTime;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WalkEngine | null>(null);

  const [phase, setPhase] = useState<WalkPhase>("arriving");
  const [stopIndex, setStopIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);

  // Assume supported on the server so the markup matches, then correct on the
  // client before the engine is ever constructed.
  const webglSupported = useSyncExternalStore(neverChanges, detectWebGL, () => true);
  const gyroSupported = useSyncExternalStore(
    neverChanges,
    LookControls.supportsGyro,
    () => false
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !webglSupported) return;

    const engine = new WalkEngine(
      element,
      { country, guide, script, accentColor, skipScriptedBeats: true },
      {
        onPhase: setPhase,
        onStop: setStopIndex,
        onBeat: () => {},
        onXRChange: setPresenting,
        onPhotoSource: setPhotoSource,
      }
    );
    engineRef.current = engine;

    let vrButton: HTMLElement | null = null;
    let cancelled = false;

    // Only offer VR when a session is actually available — three's VRButton
    // otherwise renders a "VR NOT SUPPORTED" chip on every desktop.
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then(async (supported) => {
        if (!supported || cancelled) return;
        const { VRButton } = await import("three/examples/jsm/webxr/VRButton.js");
        if (cancelled) return;
        vrButton = VRButton.createButton(engine.xrRenderer);
        vrButton.style.zIndex = "20";
        element.appendChild(vrButton);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      vrButton?.remove();
      engine.dispose();
      engineRef.current = null;
    };
  }, [country, guide, script, accentColor, webglSupported]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        engineRef.current?.advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const advance = useCallback(() => engineRef.current?.advance(), []);

  const showScene = useCallback((stop: DestinationId) => {
    return engineRef.current?.goToDestination(stop) ?? false;
  }, []);

  const enableGyro = useCallback(async () => {
    if (await engineRef.current?.enableGyro()) setGyroOn(true);
  }, []);

  if (!webglSupported) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-serif text-2xl text-zinc-100">This walk needs WebGL</p>
        <p className="max-w-sm text-sm text-zinc-400">
          Your browser could not start a 3D view. Try another browser, or check
          that hardware acceleration is enabled.
        </p>
      </main>
    );
  }

  return (
    <main
      ref={containerRef}
      // flex-1 claims the column in layout.tsx's flex body; 100dvh (not 100vh)
      // survives mobile browser chrome.
      className="relative flex-1 min-h-[100dvh] w-full overflow-hidden bg-[#05070d]"
    >
      <WalkOverlay
        guideName={guide.name}
        countryIso2={country.iso2}
        stops={stops}
        stopIndex={stopIndex}
        phase={phase}
        hidden={presenting}
        showGyro={gyroSupported && !gyroOn}
        onAdvance={advance}
        onEnableGyro={enableGyro}
        photoCredit={
          photoSource?.startsWith("/api/street-photo")
            ? (streetCredit ?? "Mapillary contributor")
            : null
        }
        teaching={
          !presenting ? (
            <WalkVoice
              country={country}
              guide={guide}
              stops={stops}
              localTime={localTime}
              onShowScene={showScene}
            />
          ) : null
        }
      />
    </main>
  );
}
