"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Dev-only reviewer for generated panorama candidates. Looking at an
// equirectangular image flat is misleading — the poles look wrong and the seam
// is invisible — so this wraps each candidate on a sphere the way the walk
// will, and points the camera straight at the seam.

export type Candidate = {
  subregion: string;
  destination: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  prompt: string | null;
};

export default function PanoramaReview({ candidates }: { candidates: Candidate[] }) {
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, "keep" | "reject">>({});
  const current = candidates[index];

  if (candidates.length === 0) {
    return <EmptyState />;
  }

  const key = `${current.subregion}/${current.destination}`;
  const kept = Object.entries(verdicts).filter(([, v]) => v === "keep");

  const setVerdict = (verdict: "keep" | "reject") => {
    setVerdicts((v) => ({ ...v, [key]: verdict }));
    if (index < candidates.length - 1) setIndex(index + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl text-zinc-50">Panorama review</h1>
        <p className="font-mono text-xs text-zinc-500">
          {index + 1} / {candidates.length} · {kept.length} kept
        </p>
      </header>

      <SphereViewer url={current.url} />

      <div className="flex flex-wrap items-center gap-2">
        {candidates.map((c, i) => {
          const v = verdicts[`${c.subregion}/${c.destination}`];
          return (
            <button
              key={c.url}
              onClick={() => setIndex(i)}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                i === index
                  ? "border-sky-400/60 bg-sky-400/15 text-sky-100"
                  : v === "keep"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : v === "reject"
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {c.subregion}/{c.destination}
            </button>
          );
        })}
      </div>

      <Metadata candidate={current} />

      <div className="flex gap-2">
        <button
          onClick={() => setVerdict("keep")}
          className="rounded-full bg-emerald-400/90 px-6 py-2.5 font-mono text-xs text-[#05070d] hover:bg-emerald-300"
        >
          keep
        </button>
        <button
          onClick={() => setVerdict("reject")}
          className="rounded-full border border-rose-400/40 px-6 py-2.5 font-mono text-xs text-rose-200 hover:bg-rose-400/10"
        >
          reject
        </button>
      </div>

      {kept.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            promote the kept ones
          </p>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-emerald-200">
            node scripts/promote-panoramas.mjs {kept.map(([k]) => k).join(" ")}
          </pre>
        </div>
      )}
    </div>
  );
}

function Metadata({ candidate }: { candidate: Candidate }) {
  const ratio = candidate.width / candidate.height;
  const equirect = Math.abs(ratio - 2) < 0.02;
  const bigEnough = candidate.width >= 4096;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 font-mono text-[11px] text-zinc-400">
        <Row label="size" value={`${candidate.width}x${candidate.height}`} />
        <Row
          label="ratio"
          value={`${ratio.toFixed(3)} ${equirect ? "ok" : "NOT 2:1 — will distort"}`}
          bad={!equirect}
        />
        <Row
          label="width"
          value={`${bigEnough ? "ok" : "under 4096 — loader will skip it"}`}
          bad={!bigEnough}
        />
        <Row label="weight" value={`${Math.round(candidate.bytes / 1024)}KB`} />
      </div>
      {candidate.prompt && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            prompt used
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{candidate.prompt}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-zinc-600">{label}</span>
      <span className={bad ? "text-rose-300" : "text-zinc-300"}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl p-10">
      <h1 className="font-serif text-2xl text-zinc-50">No candidates</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Drop generated panoramas at{" "}
        <code className="text-zinc-200">
          public/scenes/xr/_review/{"{subregion}"}/{"{destination}"}.jpg
        </code>{" "}
        and reload. Prompts for each combination are printed by{" "}
        <code className="text-zinc-200">node scripts/panorama-prompts.mjs</code>.
      </p>
    </div>
  );
}

/** Wraps the candidate on a sphere, starting aimed at the seam. */
function SphereViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [yaw, setYaw] = useState(Math.PI);
  const yawRef = useRef(yaw);

  const setYawBoth = useCallback((next: number) => {
    yawRef.current = next;
    setYaw(next);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1000);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const texture = new THREE.TextureLoader().load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material));

    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      setYawBoth(yawRef.current - (e.clientX - lastX) * 0.004);
      pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastY) * 0.004, -1.4, 1.4);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };

    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";

    const resize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    renderer.setAnimationLoop(() => {
      camera.rotation.set(pitch, yawRef.current, 0, "YXZ");
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      geometry.dispose();
      texture.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, setYawBoth]);

  return (
    <div>
      <div
        ref={containerRef}
        className="relative h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-black"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => setYawBoth(Math.PI)}
          className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3.5 py-1.5 font-mono text-[11px] text-amber-200 hover:bg-amber-300/20"
        >
          look at the seam
        </button>
        <p className="font-mono text-[11px] text-zinc-500">
          drag to look around · the seam is where the left and right edges meet
        </p>
      </div>
    </div>
  );
}
