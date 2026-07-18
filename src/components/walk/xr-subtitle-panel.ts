import * as THREE from "three";
import type { DialogueBeat } from "@/lib/walk/walk-script";

// DOM overlays are invisible in immersive WebXR, and `dom-overlay` is an AR
// feature unavailable to immersive-vr. So the same beat is rendered twice:
// as DOM by walk-overlay.tsx, and in-world here.

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 512;
const PANEL_WIDTH = 1.3;
const DISTANCE = 1.7;
const DROP = -0.28;
const FOLLOW = 2;

export class XRSubtitlePanel {
  readonly group = new THREE.Group();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.PlaneGeometry;
  private yaw = 0;

  constructor(anisotropy: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // Text on an angled plane is the one place anisotropy visibly pays off.
    this.texture.anisotropy = anisotropy;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      fog: false,
    });
    this.geometry = new THREE.PlaneGeometry(
      PANEL_WIDTH,
      (PANEL_WIDTH * CANVAS_HEIGHT) / CANVAS_WIDTH
    );

    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.set(0, DROP, -DISTANCE);
    mesh.renderOrder = 999;
    this.group.add(mesh);
    this.group.visible = false;
  }

  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  /** Redrawn only when the beat changes — never per frame. */
  render(beat: DialogueBeat | null, guideName: string) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!beat) {
      this.texture.needsUpdate = true;
      return;
    }

    roundedRect(ctx, 24, 24, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 48, 28);
    ctx.fillStyle = "rgba(5, 7, 13, 0.86)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
    ctx.stroke();

    ctx.fillStyle = "rgba(125, 211, 252, 0.75)";
    ctx.font = "500 26px ui-monospace, monospace";
    ctx.fillText(guideName.toUpperCase(), 60, 92);

    ctx.fillStyle = "#f4f4f5";
    ctx.font = "40px ui-sans-serif, system-ui, sans-serif";
    let y = wrapText(ctx, beat.text, 60, 160, CANVAS_WIDTH - 120, 52);

    if (beat.word) {
      y += 28;
      ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
      ctx.font = "600 46px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(beat.word.term, 60, y);
      y += 50;

      if (beat.word.roman) {
        ctx.fillStyle = "rgba(253, 230, 138, 0.8)";
        ctx.font = "italic 32px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(beat.word.roman, 60, y);
        y += 42;
      }

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "30px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(beat.word.gloss, 60, y);
    }

    this.texture.needsUpdate = true;
  }

  /**
   * Follows the camera's yaw with lag. Parenting text rigidly to an XR camera
   * is a known nausea trigger — it must drift into view, not be welded on.
   */
  update(dt: number, camera: THREE.Camera) {
    if (!this.group.visible) return;

    const cameraYaw = Math.atan2(
      -camera.matrixWorld.elements[8],
      -camera.matrixWorld.elements[10]
    );
    let delta = cameraYaw - this.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    this.yaw += delta * Math.min(1, dt * FOLLOW);
    this.group.rotation.y = this.yaw;
    camera.getWorldPosition(this.group.position);
  }

  dispose() {
    this.geometry.dispose();
    this.texture.dispose();
    this.material.dispose();
    this.group.clear();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  let line = "";
  let cursorY = y;
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}
