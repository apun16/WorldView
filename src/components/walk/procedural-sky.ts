import * as THREE from "three";
import type { DestinationId } from "@/lib/destinations";
import { scenePalette, type ScenePalette } from "@/lib/walk/scene-palette";
import { seededRandom } from "@/lib/seeded-random";
import { withAlpha, mixHex } from "@/lib/color";

// The zero-asset environment. Every country walks on this; real photospheres
// are an enhancement that fades in over the top. It follows agent-marker.ts's
// approach — draw into a 2D canvas, wrap in a CanvasTexture, cache by value.

const WIDTH = 2048;
const HEIGHT = 1024;
const HORIZON_Y = HEIGHT * 0.5;
const MAX_CACHED = 24;

// A home and a classroom are rooms, not views. Drawing them with a sky and a
// horizon reads as standing outdoors looking at a building, which is the wrong
// place entirely.
const INTERIORS = new Set<DestinationId>(["home", "school"]);

// Where the walls meet ceiling and floor, as a fraction of image height.
const CEILING_Y = HEIGHT * 0.3;
const FLOOR_Y = HEIGHT * 0.72;

const cache = new Map<string, THREE.CanvasTexture>();

export function proceduralSky(
  iso2: string,
  destination: DestinationId
): THREE.CanvasTexture {
  const key = `${iso2}:${destination}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const palette = scenePalette(destination);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  if (INTERIORS.has(destination)) {
    drawInterior(ctx, palette, iso2, destination);
  } else {
    drawSky(ctx, palette);
    drawSun(ctx, palette);
    drawGround(ctx, palette);
    drawSkyline(ctx, palette, iso2, destination);
    drawHaze(ctx, palette);
  }

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


/**
 * A stylised room. Equirectangular bands map cleanly onto a room's parts: the
 * top of the image is the ceiling above you, the middle band is the walls all
 * around, and the bottom is the floor at your feet.
 */
function drawInterior(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  iso2: string,
  destination: DestinationId
) {
  const rand = seededRandom(iso2, destination, "interior");
  const wall = mixHex(palette.ground, "#f2ede3", 0.55);
  const trim = mixHex(palette.silhouette, wall, 0.45);

  // Ceiling, brightest near the centre where a light would sit.
  const ceiling = ctx.createLinearGradient(0, 0, 0, CEILING_Y);
  ceiling.addColorStop(0, mixHex(wall, "#ffffff", 0.28));
  ceiling.addColorStop(1, wall);
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, WIDTH, CEILING_Y);

  // Walls.
  ctx.fillStyle = wall;
  ctx.fillRect(0, CEILING_Y, WIDTH, FLOOR_Y - CEILING_Y);

  // Floor, darkening toward the nadir so the pole reads as ground in shadow.
  const floor = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
  floor.addColorStop(0, mixHex(palette.ground, "#000000", 0.15));
  floor.addColorStop(1, mixHex(palette.ground, "#000000", 0.55));
  ctx.fillStyle = floor;
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

  // Skirting, which is what makes the floor/wall join read as a room edge.
  ctx.fillStyle = trim;
  ctx.fillRect(0, FLOOR_Y - HEIGHT * 0.012, WIDTH, HEIGHT * 0.012);

  // Four walls at even intervals; each gets one feature. Drawn across three
  // offsets so the wrap behind the viewer stays continuous.
  const features = Array.from({ length: 4 }, () => rand());
  for (const offset of [-WIDTH, 0, WIDTH]) {
    for (let i = 0; i < 4; i++) {
      const cx = offset + WIDTH * (i / 4 + 0.125);
      if (cx < -WIDTH * 0.2 || cx > WIDTH * 1.2) continue;
      const pick = features[i];

      if (destination === "school") {
        if (pick < 0.4) drawBlackboard(ctx, cx, trim, palette);
        else if (pick < 0.75) drawWindow(ctx, cx, palette);
        else drawDoor(ctx, cx, trim);
      } else {
        if (pick < 0.45) drawWindow(ctx, cx, palette);
        else if (pick < 0.75) drawShelf(ctx, cx, trim);
        else drawDoor(ctx, cx, trim);
      }
    }
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, cx: number, palette: ScenePalette) {
  const w = WIDTH * 0.11;
  const h = (FLOOR_Y - CEILING_Y) * 0.52;
  const y = CEILING_Y + (FLOOR_Y - CEILING_Y) * 0.16;

  // Daylight outside is what stops a room reading as a sealed box.
  const glow = ctx.createLinearGradient(0, y, 0, y + h);
  glow.addColorStop(0, palette.horizon);
  glow.addColorStop(1, mixHex(palette.horizon, "#ffffff", 0.35));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - w / 2, y, w, h);

  ctx.strokeStyle = palette.silhouette;
  ctx.lineWidth = 5;
  ctx.strokeRect(cx - w / 2, y, w, h);
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + h);
  ctx.stroke();
}

function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  cx: number,
  trim: string,
  palette: ScenePalette
) {
  const w = WIDTH * 0.16;
  const h = (FLOOR_Y - CEILING_Y) * 0.46;
  const y = CEILING_Y + (FLOOR_Y - CEILING_Y) * 0.2;
  ctx.fillStyle = mixHex(palette.silhouette, "#1d3b2a", 0.5);
  ctx.fillRect(cx - w / 2, y, w, h);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 7;
  ctx.strokeRect(cx - w / 2, y, w, h);

  // Faint chalk marks, so it reads as used rather than a blank rectangle.
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const ly = y + h * (0.28 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.36, ly);
    ctx.lineTo(cx - w * 0.36 + w * (0.3 + i * 0.16), ly);
    ctx.stroke();
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, cx: number, trim: string) {
  const w = WIDTH * 0.055;
  const h = FLOOR_Y - CEILING_Y - HEIGHT * 0.04;
  const y = FLOOR_Y - h;
  ctx.fillStyle = trim;
  ctx.fillRect(cx - w / 2, y, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - w / 2 + w * 0.12, y + h * 0.06, w * 0.76, h * 0.88);
}

function drawShelf(ctx: CanvasRenderingContext2D, cx: number, trim: string) {
  const w = WIDTH * 0.1;
  const y = CEILING_Y + (FLOOR_Y - CEILING_Y) * 0.42;
  ctx.fillStyle = trim;
  for (let i = 0; i < 3; i++) {
    const sy = y + i * HEIGHT * 0.055;
    ctx.fillRect(cx - w / 2, sy, w, HEIGHT * 0.008);
    // Objects on the shelf, sized off the shelf index so they stay stable.
    for (let j = 0; j < 4; j++) {
      const oh = HEIGHT * (0.016 + ((i + j) % 3) * 0.006);
      ctx.fillRect(cx - w / 2 + w * (0.08 + j * 0.22), sy - oh, w * 0.12, oh);
    }
  }
}
