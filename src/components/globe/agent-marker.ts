import * as THREE from "three";

// Guides are three.js planes rather than HTML overlays. three-globe rotates
// each object by Euler(-lat, lng, 0, 'YXZ'), which leaves a plane's local XY
// tangent to the sphere — so the silhouette lies along the globe's curvature
// like a decal pressed into the surface, instead of billboarding at the camera.

// three-globe's globe radius is 100 units, so ~1 unit ≈ 64km of surface.
const MARKER_SIZE = 2.6;
const SELECTED_SCALE = 1.3;
const TEXTURE_SIZE = 128;
// The silhouette is a small target at globe scale, so an invisible plane
// widens the click/hover area well past the visible art.
const HIT_SCALE = 2.4;

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
// flicker loop, so colour changes never go through three-globe.
const markerMeshes = new Map<string, THREE.Mesh>();

export function createAgentMarker(
  agentId: string,
  color: string,
  isSelected: boolean
): THREE.Object3D {
  const size = MARKER_SIZE * (isSelected ? SELECTED_SCALE : 1);

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(getGeometry(size), getMaterial(color));
  // Draw after the country polygons so the decal always reads on top.
  mesh.renderOrder = 10;
  markerMeshes.set(agentId, mesh);

  const hitArea = new THREE.Mesh(getGeometry(size * HIT_SCALE), getHitMaterial());
  group.add(mesh, hitArea);
  return group;
}

export function setAgentMarkerColor(agentId: string, color: string) {
  const mesh = markerMeshes.get(agentId);
  if (mesh) mesh.material = getMaterial(color);
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

function getMaterial(color: string): THREE.Material {
  const cached = materialCache.get(color);
  if (cached) return cached;
  const material = new THREE.MeshBasicMaterial({
    map: getMarkerTexture(color),
    transparent: true,
    // Sit flush over the country cap without punching into the depth buffer.
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materialCache.set(color, material);
  return material;
}

function getMarkerTexture(color: string): THREE.Texture {
  const cached = textureCache.get(color);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const c = TEXTURE_SIZE / 2;

  // Soft halo, so the marker reads as lit from within the surface.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, withAlpha(color, 0.55));
  glow.addColorStop(0.55, withAlpha(color, 0.22));
  glow.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Recessed socket the figure sits in.
  ctx.beginPath();
  ctx.arc(c, c, c * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(5, 7, 13, 0.55)";
  ctx.fill();
  ctx.lineWidth = TEXTURE_SIZE * 0.022;
  ctx.strokeStyle = withAlpha(color, 0.85);
  ctx.stroke();

  drawPerson(ctx, color);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  textureCache.set(color, texture);
  return texture;
}

function drawPerson(ctx: CanvasRenderingContext2D, color: string) {
  const s = TEXTURE_SIZE / 100;
  ctx.save();
  ctx.translate(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // head
  ctx.beginPath();
  ctx.arc(0, -16, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // shoulders / torso
  ctx.beginPath();
  ctx.moveTo(-17, 20);
  ctx.arc(0, 20, 17, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
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
