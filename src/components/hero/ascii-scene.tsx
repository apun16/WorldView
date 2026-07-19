"use client";

import { useEffect, useRef } from "react";

// Cultural scenes from around the world, rendered through an ASCII filter and
// cross-faded like a slow film reel of the planet.
const SCENES = [
  "/scenes/scene-00.jpg",
  "/scenes/scene-02.jpg",
  "/scenes/scene-04.jpg",
  "/scenes/scene-11.jpg",
  "/scenes/scene-06.jpg",
  "/scenes/scene-03.jpg",
  "/scenes/scene-10.jpg",
  "/scenes/scene-05.jpg",
  "/scenes/scene-07.jpg",
  "/scenes/scene-01.jpg",
  "/scenes/scene-08.jpg",
];

// Dark -> light density ramp. Brighter pixels get denser glyphs.
const RAMP = " .·:-=+co*ae68#@";

// WorldView warm dusk gradient, keyed on luminance [0,1].
// deep plum -> wine -> burnt sienna -> apricot -> pale cream
const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [24, 16, 34]],
  [0.28, [82, 42, 48]],
  [0.55, [176, 94, 58]],
  [0.78, [245, 185, 113]],
  [1.0, [255, 241, 220]],
];

function gradeColor(luma: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    if (luma <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const t = (luma - t0) / (t1 - t0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export default function AsciiScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cell = 9;

    // Offscreen buffers
    const photoCanvas = document.createElement("canvas");
    const photoCtx = photoCanvas.getContext("2d", { willReadFrequently: true })!;
    const sampleCanvas = document.createElement("canvas");
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true })!;
    let layerA = document.createElement("canvas");
    let layerB = document.createElement("canvas");

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    SCENES.forEach((src, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedCount++;
        if (loadedCount === 1) {
          curIndex = i;
          renderScene(images[curIndex], layerA);
          ready = true;
        }
      };
      img.src = src;
      images[i] = img;
    });

    let ready = false;
    let curIndex = 0;
    let nextIndex = 0;
    let fading = false;
    let fadeStart = 0;
    let lastSwap = 0;
    const FADE_MS = 2200;
    const HOLD_MS = 5200;

    const resizeBuffers = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cell = width < 640 ? 8 : 9;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      photoCanvas.width = width;
      photoCanvas.height = height;

      for (const layer of [layerA, layerB]) {
        layer.width = width * dpr;
        layer.height = height * dpr;
      }
    };

    const renderScene = (img: HTMLImageElement, layer: HTMLCanvasElement) => {
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const lctx = layer.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, width, height);

      // opaque base so each layer is fully opaque for a clean cross-dissolve
      lctx.fillStyle = "#151020";
      lctx.fillRect(0, 0, width, height);

      // cover-fit the photo
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      photoCtx.setTransform(1, 0, 0, 1, 0, 0);
      photoCtx.clearRect(0, 0, width, height);
      photoCtx.drawImage(img, dx, dy, dw, dh);

      // faint, warm-graded photo underlay so silhouettes read
      lctx.globalAlpha = 0.14;
      lctx.drawImage(photoCanvas, 0, 0, width, height);
      lctx.globalAlpha = 1;
      lctx.fillStyle = "rgba(21, 16, 32, 0.55)";
      lctx.fillRect(0, 0, width, height);

      // sample grid
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      sampleCanvas.width = cols;
      sampleCanvas.height = rows;
      sampleCtx.drawImage(photoCanvas, 0, 0, width, height, 0, 0, cols, rows);
      const data = sampleCtx.getImageData(0, 0, cols, rows).data;

      lctx.font = `${cell + 1}px ui-monospace, "Geist Mono", monospace`;
      lctx.textAlign = "center";
      lctx.textBaseline = "middle";

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const p = (gy * cols + gx) * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(luma * RAMP.length))];
          if (ch === " ") continue;

          const [gr, gg, gb] = gradeColor(luma);
          // blend a touch of the original hue for life
          const mr = Math.round(gr * 0.8 + r * 0.2);
          const mg = Math.round(gg * 0.8 + g * 0.2);
          const mb = Math.round(gb * 0.8 + b * 0.2);
          const alpha = 0.3 + luma * 0.55;

          lctx.fillStyle = `rgba(${mr}, ${mg}, ${mb}, ${alpha})`;
          lctx.fillText(ch, gx * cell + cell / 2, gy * cell + cell / 2);
        }
      }
    };

    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    let raf = 0;
    let startTime: number | null = null;

    const frame = (time: number) => {
      if (startTime === null) startTime = time;
      if (ready) {
        const elapsed = time - startTime;

        if (!fading && loadedCount > 1 && elapsed - lastSwap > HOLD_MS) {
          nextIndex = (curIndex + 1) % images.length;
          const nimg = images[nextIndex];
          if (nimg && nimg.complete && nimg.naturalWidth > 0) {
            renderScene(nimg, layerB);
            fading = true;
            fadeStart = elapsed;
          } else {
            lastSwap = elapsed;
          }
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (fading) {
          const raw = Math.min(1, (elapsed - fadeStart) / FADE_MS);
          const t = easeInOut(raw);
          ctx.globalAlpha = 1 - t;
          ctx.drawImage(layerA, 0, 0);
          ctx.globalAlpha = t;
          ctx.drawImage(layerB, 0, 0);
          ctx.globalAlpha = 1;
          if (raw >= 1) {
            const tmp = layerA;
            layerA = layerB;
            layerB = tmp;
            curIndex = nextIndex;
            fading = false;
            lastSwap = elapsed;
          }
        } else {
          ctx.drawImage(layerA, 0, 0);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resizeBuffers();
      if (ready) {
        renderScene(images[curIndex], layerA);
        if (fading) renderScene(images[nextIndex], layerB);
      }
    };

    resizeBuffers();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="ascii-drift h-full w-full" />
    </div>
  );
}
