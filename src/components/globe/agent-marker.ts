import * as THREE from "three";
import type { Gender } from "@/lib/agents";

// Guides are three.js planes rather than HTML overlays. three-globe rotates
// each object by Euler(-lat, lng, 0, 'YXZ'), which leaves a plane's local XY
// tangent to the sphere — so the silhouette lies along the globe's curvature
// like a decal pressed into the surface, instead of billboarding at the camera.

// three-globe's globe radius is 100 units, so ~1 unit ≈ 64km of surface.
const MARKER_SIZE = 7.2;
const SELECTED_SCALE = 1.25;
const TEXTURE_SIZE = 220;
// The silhouette is a small target at globe scale, so an invisible plane
// widens the click/hover area well past the visible art.
const HIT_SCALE = 1.5;

// The figure itself is always jet black — bold and legible against every
// globe palette. `color` (the palette's hover/selected accent) only shows up
// on the tack and the glow behind the silhouette, so state is still readable
// without tinting the whole pin.
const FIGURE_COLOR = "#000000";

/**
 * Hover colour for a marker. Deliberately a fixed near-white rather than a
 * palette entry: every palette's accent colours collide with each other
 * (forest's hover and languageMatch are the same value), so only an off-palette
 * colour reads as "clickable" across all four.
 */
export const AGENT_HOVER_COLOR = "#ffffff";

// three-globe recreates marker meshes whenever the data or accessor changes,
// and three.js never disposes them for us. Sharing geometry/material/texture
// across meshes keeps repeated hovering from leaking GPU resources.
const textureCache = new Map<string, THREE.Texture>();
const materialCache = new Map<string, THREE.Material>();
const geometryCache = new Map<number, THREE.BufferGeometry>();
const HIT_MATERIAL_KEY = "__hit__";

// Live meshes by agent id, so hover can recolor a marker in place. Rebuilding
// the mesh under the cursor would drop the raycast hit and restart the hover
// flicker loop, so colour changes never go through three-globe. Gender is
// remembered alongside so a later recolor can rebuild the right silhouette.
const markerMeshes = new Map<string, THREE.Mesh>();
const markerGenders = new Map<string, Gender>();

export function createAgentMarker(
  agentId: string,
  color: string,
  isSelected: boolean,
  gender: Gender,
  sizeScale: number = 1
): THREE.Object3D {
  const size = MARKER_SIZE * sizeScale * (isSelected ? SELECTED_SCALE : 1);
  markerGenders.set(agentId, gender);

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(getGeometry(size), getMaterial(color, gender));
  // Draw after the country polygons so the decal always reads on top.
  mesh.renderOrder = 10;
  markerMeshes.set(agentId, mesh);

  const hitArea = new THREE.Mesh(getGeometry(size * HIT_SCALE), getHitMaterial());
  group.add(mesh, hitArea);
  return group;
}

export function setAgentMarkerColor(agentId: string, color: string) {
  const mesh = markerMeshes.get(agentId);
  const gender = markerGenders.get(agentId);
  if (mesh && gender) mesh.material = getMaterial(color, gender);
}

function getHitMaterial(): THREE.Material {
  const cached = materialCache.get(HIT_MATERIAL_KEY);
  if (cached) return cached;
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  materialCache.set(HIT_MATERIAL_KEY, material);
  return material;
}

function getGeometry(size: number): THREE.BufferGeometry {
  const cached = geometryCache.get(size);
  if (cached) return cached;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometryCache.set(size, geometry);
  return geometry;
}

function getMaterial(color: string, gender: Gender): THREE.Material {
  const key = `${color}:${gender}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshBasicMaterial({
    map: getMarkerTexture(color, gender),
    transparent: true,
    // Sit flush over the country cap without punching into the depth buffer.
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materialCache.set(key, material);
  return material;
}

function getMarkerTexture(color: string, gender: Gender): THREE.Texture {
  const key = `${color}:${gender}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;

  drawPinnedFigure(ctx, color, gender);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/**
 * A stick figure "pinned" to the globe like a photo tacked to a corkboard —
 * no badge, no circular backdrop. A small tack at the crown, a soft ground
 * shadow at the feet, and a bigger, gender-distinct silhouette in between:
 * a dress + pigtails for female guides, a plain torso + split legs for male.
 *
 * The figure is drawn feet-first at local (0,0) — the texture's centre, which
 * three-globe anchors to the marker's exact lat/lng — and grows upward from
 * there. That keeps the character's feet standing on the sampled point
 * (already verified to be inside the country) instead of the sprite's own
 * visual centre, which used to sit ~30 units above/away from the true anchor.
 */
function drawPinnedFigure(ctx: CanvasRenderingContext2D, color: string, gender: Gender) {
  const s = TEXTURE_SIZE / 100;
  ctx.save();
  ctx.translate(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  ctx.scale(s, s);

  // ground shadow at the anchor point, drawn first so the figure sits on it
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fill();

  ctx.strokeStyle = FIGURE_COLOR;
  ctx.fillStyle = FIGURE_COLOR;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Glow stays keyed to the palette accent so hover/selection is still
  // readable even though the silhouette itself is always black.
  ctx.shadowColor = withAlpha(color, 0.85);
  ctx.shadowBlur = 10;

  if (gender === "female") drawGirl(ctx);
  else drawGuy(ctx);

  // tack pinning the figure to the board — carries the accent colour so it
  // still reads as "clickable" without tinting the whole silhouette
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(0, -43, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(5, 7, 13, 0.55)";
  ctx.stroke();

  ctx.restore();
}

function drawGirl(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 4;

  // head
  ctx.beginPath();
  ctx.arc(0, -34, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // pigtails
  ctx.beginPath();
  ctx.ellipse(-7, -32, 2.6, 4, -0.4, 0, Math.PI * 2);
  ctx.ellipse(7, -32, 2.6, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // dress (A-line silhouette)
  ctx.beginPath();
  ctx.moveTo(-5, -27);
  ctx.lineTo(5, -27);
  ctx.lineTo(12, -7);
  ctx.quadraticCurveTo(0, -2, -12, -7);
  ctx.closePath();
  ctx.fill();

  // arms
  ctx.beginPath();
  ctx.moveTo(-5, -26);
  ctx.lineTo(-11, -16);
  ctx.moveTo(5, -26);
  ctx.lineTo(11, -16);
  ctx.stroke();

  // legs peeking under the hem, feet resting on the anchor point
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, -8);
  ctx.lineTo(4, 0);
  ctx.stroke();
}

function drawGuy(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 4.2;

  // head
  ctx.beginPath();
  ctx.arc(0, -34, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // torso
  const torso = new Path2D();
  torso.moveTo(-6, -27);
  torso.lineTo(6, -27);
  torso.lineTo(5, -8);
  torso.lineTo(-5, -8);
  torso.closePath();
  ctx.fill(torso);

  // arms
  ctx.beginPath();
  ctx.moveTo(-6, -25);
  ctx.lineTo(-12, -14);
  ctx.moveTo(6, -25);
  ctx.lineTo(12, -14);
  ctx.stroke();

  // split legs, feet resting on the anchor point
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-7, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(7, 0);
  ctx.stroke();
}

/** Accepts the rgba()/hex strings used by the globe palettes. */
function withAlpha(color: string, alpha: number): string {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b] = rgba[1].split(",").map((part) => parseFloat(part));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
