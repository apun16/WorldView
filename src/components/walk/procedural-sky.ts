import * as THREE from "three";
import type { DestinationId } from "@/lib/destinations";
import type { TimeOfDay } from "@/lib/local-time";
import { scenePalette, type ScenePalette } from "@/lib/walk/scene-palette";
import { seededRandom } from "@/lib/seeded-random";
import { withAlpha } from "@/lib/color";

// The zero-asset environment. Every country walks on this; real photospheres
// are an enhancement that fades in over the top. It follows agent-marker.ts's
// approach — draw into a 2D canvas, wrap in a CanvasTexture, cache by value.

const WIDTH = 2048;
const HEIGHT = 1024;
const HORIZON_Y = HEIGHT * 0.5;
const MAX_CACHED = 24;

const cache = new Map<string, THREE.CanvasTexture>();

export function proceduralSky(
  iso2: string,
  destination: DestinationId,
  period: TimeOfDay
): THREE.CanvasTexture {
  const key = `${iso2}:${destination}:${period}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const palette = scenePalette(destination, period);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  drawSky(ctx, palette);
  drawSun(ctx, palette);
  drawGround(ctx, palette);
  drawSkyline(ctx, palette, iso2, destination);
  drawHaze(ctx, palette);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Equirectangular wrapping: mipmaps blur the poles into mush and cost a
  // third more memory for no gain on a backdrop.
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  evictIfFull();
  cache.set(key, texture);
  return texture;
}

/** Procedural textures are shared across mounts, so the engine must never
 *  dispose them. This is the only place they are released. */
function evictIfFull() {
  if (cache.size < MAX_CACHED) return;
  const oldest = cache.keys().next().value;
  if (oldest === undefined) return;
  cache.get(oldest)?.dispose();
  cache.delete(oldest);
}

function drawSky(ctx: CanvasRenderingContext2D, palette: ScenePalette) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  gradient.addColorStop(0, palette.zenith);
  gradient.addColorStop(1, palette.horizon);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HORIZON_Y);
}

function drawSun(ctx: CanvasRenderingContext2D, palette: ScenePalette) {
  const x = palette.sunX * WIDTH;
  const y = HORIZON_Y - HEIGHT * 0.12;
  const radius = HEIGHT * 0.34;

  // Drawn twice so a sun near the seam is not cut in half behind the viewer.
  for (const cx of [x, x - WIDTH, x + WIDTH]) {
    const glow = ctx.createRadialGradient(cx, y, 0, cx, y, radius);
    glow.addColorStop(0, withAlpha(palette.sun, 0.95));
    glow.addColorStop(0.12, withAlpha(palette.sun, 0.5));
    glow.addColorStop(1, withAlpha(palette.sun, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(cx - radius, y - radius, radius * 2, radius * 2);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, palette: ScenePalette) {
  const gradient = ctx.createLinearGradient(0, HORIZON_Y, 0, HEIGHT);
  gradient.addColorStop(0, palette.ground);
  gradient.addColorStop(1, shade(palette.ground, 0.45));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, HORIZON_Y, WIDTH, HEIGHT - HORIZON_Y);

  // The bottom row of an equirect map collapses to a single point. Darkening
  // it turns that pinch into something that reads as shadow underfoot.
  const nadir = ctx.createLinearGradient(0, HEIGHT * 0.86, 0, HEIGHT);
  nadir.addColorStop(0, withAlpha("#000000", 0));
  nadir.addColorStop(1, withAlpha("#000000", 0.55));
  ctx.fillStyle = nadir;
  ctx.fillRect(0, HEIGHT * 0.86, WIDTH, HEIGHT * 0.14);
}

/**
 * A seeded silhouette along the horizon. This is what stops the fallback
 * reading as an empty gradient: every country gets a skyline that is stable
 * across reloads and different from its neighbours'.
 */
function drawSkyline(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  iso2: string,
  destination: DestinationId
) {
  const rand = seededRandom(iso2, destination);
  ctx.fillStyle = palette.silhouette;

  // Lay the skyline out once, then stamp that same data at each offset. The
  // PRNG cannot be replayed (it is a closure), so generating per-pass would
  // give the wrap-around bands different buildings and a visible seam.
  type Shape = { x: number; width: number; height: number; seeds: number[] };
  const shapes: Shape[] = [];
  for (let x = 0; x < WIDTH; ) {
    const width = 40 + rand() * 150;
    const height =
      destination === "nature"
        ? 20 + rand() * 90
        : 40 + rand() * (destination === "street" || destination === "market" ? 150 : 110);
    // Pre-draw the randomness the shape renderers need, so replaying a shape
    // at another offset produces identical windows and rooflines.
    const seeds = Array.from({ length: 64 }, () => rand());
    shapes.push({ x, width, height, seeds });
    x += width + rand() * 26;
  }

  for (const offset of [-WIDTH, 0, WIDTH]) {
    for (const shape of shapes) {
      const x = shape.x + offset;
      if (x > WIDTH || x + shape.width < 0) continue;
      let i = 0;
      const next = () => shape.seeds[i++ % shape.seeds.length];

      if (destination === "nature") {
        drawTree(ctx, x + shape.width / 2, HORIZON_Y, shape.height, shape.width * 0.5);
      } else if (destination === "market") {
        drawStall(ctx, x, HORIZON_Y, shape.width, shape.height, palette);
      } else {
        drawBuilding(ctx, x, HORIZON_Y, shape.width, shape.height, destination, next);
      }
      ctx.fillStyle = palette.silhouette;
    }
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  height: number,
  destination: DestinationId,
  rand: () => number
) {
  ctx.fillRect(x, baseY - height, width, height);

  if (destination === "home" && rand() > 0.4) {
    // A pitched roof, so homes read differently from offices.
    ctx.beginPath();
    ctx.moveTo(x - 6, baseY - height);
    ctx.lineTo(x + width / 2, baseY - height - 18 - rand() * 20);
    ctx.lineTo(x + width + 6, baseY - height);
    ctx.closePath();
    ctx.fill();
  }

  // Windows: a couple of lit ones imply the place is inhabited.
  const cols = Math.max(1, Math.floor(width / 26));
  const rows = Math.max(1, Math.floor(height / 30));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (rand() > 0.55) continue;
      ctx.save();
      ctx.globalAlpha = 0.25 + rand() * 0.35;
      ctx.fillStyle = "#ffd9a0";
      ctx.fillRect(x + 8 + c * 26, baseY - height + 12 + r * 30, 9, 12);
      ctx.restore();
    }
  }
}

function drawStall(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  height: number,
  palette: ScenePalette
) {
  const canopy = Math.min(height * 0.45, 60);
  ctx.fillRect(x + width * 0.1, baseY - height + canopy, width * 0.8, height - canopy);

  // Scalloped awning — the shape that says "market" at a glance.
  ctx.save();
  ctx.fillStyle = shade(palette.silhouette, 1.5);
  ctx.beginPath();
  ctx.moveTo(x, baseY - height + canopy);
  ctx.lineTo(x + width / 2, baseY - height);
  ctx.lineTo(x + width, baseY - height + canopy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  height: number,
  spread: number
) {
  ctx.fillRect(cx - 3, baseY - height * 0.45, 6, height * 0.45);
  ctx.beginPath();
  ctx.ellipse(cx, baseY - height * 0.62, spread, height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHaze(ctx: CanvasRenderingContext2D, palette: ScenePalette) {
  const band = HEIGHT * 0.08;
  const gradient = ctx.createLinearGradient(0, HORIZON_Y - band, 0, HORIZON_Y + band);
  gradient.addColorStop(0, withAlpha(palette.haze, 0));
  gradient.addColorStop(0.5, withAlpha(palette.haze, 0.6));
  gradient.addColorStop(1, withAlpha(palette.haze, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, HORIZON_Y - band, WIDTH, band * 2);
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}
