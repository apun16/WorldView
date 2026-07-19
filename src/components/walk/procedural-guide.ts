import * as THREE from "three";
import type { AgentIdentity } from "@/lib/agents";
import type { GuideState } from "@/lib/walk/walk-script";
import type { ScenePalette } from "@/lib/walk/scene-palette";
import type { GuideAvatar } from "@/components/walk/guide-avatar";

// A humanoid built from primitives — there are no character assets in the repo.
// It is deliberately stylised rather than attempting realism it cannot reach:
// the accent colour and rim light match the guide's marker on the globe, so
// this reads as the same character the user clicked.

const CADENCE = 2.4;
const STATE_BLEND = 6;

export function createProceduralGuide(
  identity: AgentIdentity,
  palette: ScenePalette,
  accentColor: string
): GuideAvatar {
  return new ProceduralGuide(identity, palette, accentColor);
}

class ProceduralGuide implements GuideAvatar {
  readonly object = new THREE.Group();

  private body = new THREE.Group();
  private head = new THREE.Group();
  private hipL = new THREE.Group();
  private hipR = new THREE.Group();
  private kneeL = new THREE.Group();
  private kneeR = new THREE.Group();
  private shoulderL = new THREE.Group();
  private shoulderR = new THREE.Group();
  private elbowL = new THREE.Group();
  private elbowR = new THREE.Group();

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private phase = 0;
  private walkAmount = 0;
  private state: GuideState = "idle";
  private targetQuaternion = new THREE.Quaternion();
  private shadow: THREE.Mesh | null = null;

  constructor(
    private identity: AgentIdentity,
    palette: ScenePalette,
    accentColor: string
  ) {
    const skin = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.7,
      metalness: 0.05,
      // A faint self-glow so the figure holds up against a bright photosphere
      // and reads as a deliberate presence rather than a flat cutout.
      emissive: new THREE.Color(accentColor).multiplyScalar(0.22),
    });
    const cloth = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.silhouette).lerp(new THREE.Color(accentColor), 0.25),
      roughness: 0.9,
      emissive: new THREE.Color(accentColor).multiplyScalar(0.06),
    });
    this.materials.push(skin, cloth);

    const isFemale = identity.gender === "female";

    // Legs — hips at 0.92, so the figure stands on y=0.
    this.hipL.position.set(-0.09, 0.92, 0);
    this.hipR.position.set(0.09, 0.92, 0);
    for (const [hip, knee] of [
      [this.hipL, this.kneeL],
      [this.hipR, this.kneeR],
    ] as const) {
      hip.add(this.limb(0.07, 0.36, cloth, -0.18));
      knee.position.y = -0.36;
      knee.add(this.limb(0.06, 0.34, cloth, -0.17));
      const foot = new THREE.Mesh(this.geo(new THREE.BoxGeometry(0.09, 0.05, 0.2)), cloth);
      foot.position.set(0, -0.36, 0.04);
      knee.add(foot);
      hip.add(knee);
      this.body.add(hip);
    }

    // Torso and head.
    const torso = this.limb(isFemale ? 0.15 : 0.17, 0.44, cloth, -0.22);
    torso.position.y = 1.2;
    this.body.add(torso);

    const headMesh = new THREE.Mesh(this.geo(new THREE.CapsuleGeometry(0.11, 0.06, 4, 12)), skin);
    this.head.position.y = 1.6;
    this.head.add(headMesh);
    this.body.add(this.head);

    // Arms.
    this.shoulderL.position.set(-0.21, 1.42, 0);
    this.shoulderR.position.set(0.21, 1.42, 0);
    for (const [shoulder, elbow] of [
      [this.shoulderL, this.elbowL],
      [this.shoulderR, this.elbowR],
    ] as const) {
      shoulder.add(this.limb(0.055, 0.3, cloth, -0.15));
      elbow.position.y = -0.3;
      elbow.add(this.limb(0.05, 0.28, skin, -0.14));
      shoulder.add(elbow);
      this.body.add(shoulder);
    }

    this.object.add(this.body);
    this.object.add(this.createShadow(accentColor));
  }

  private geo<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private limb(
    radius: number,
    length: number,
    material: THREE.Material,
    offsetY: number
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.geo(new THREE.CapsuleGeometry(radius, length, 4, 10)),
      material
    );
    mesh.position.y = offsetY;
    return mesh;
  }

  /** A painted shadow — a real shadow map costs a depth pass for almost no
   *  gain when the ground is a photosphere pole. */
  private createShadow(accentColor: string): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,0.55)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      color: new THREE.Color(accentColor).lerp(new THREE.Color("#000000"), 0.7),
    });
    this.materials.push(material);

    const mesh = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(1.1, 1.1)), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    this.shadow = mesh;
    return mesh;
  }

  setState(state: GuideState) {
    this.state = state;
  }

  followPath(points: THREE.Vector3[], t: number) {
    if (points.length === 0) return;
    if (points.length === 1) {
      this.object.position.copy(points[0]);
      return;
    }

    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    const scaled = clamped * (points.length - 1);
    const index = Math.min(Math.floor(scaled), points.length - 2);
    const local = scaled - index;

    const position = points[index].clone().lerp(points[index + 1], local);
    const heading = points[index + 1].clone().sub(points[index]);

    this.object.position.copy(position);
    if (heading.lengthSq() > 1e-6) {
      const angle = Math.atan2(heading.x, heading.z);
      this.targetQuaternion.setFromEuler(new THREE.Euler(0, angle, 0));
    }
  }

  update(dt: number, lookAt: THREE.Vector3) {
    const walking = this.state === "walking";
    this.walkAmount += ((walking ? 1 : 0) - this.walkAmount) * Math.min(1, dt * STATE_BLEND);

    if (walking) this.phase += dt * CADENCE;
    const swing = this.walkAmount;

    // Legs. The knee clamp is what separates walking from swimming — a knee
    // that bends both ways reads as broken instantly.
    this.hipL.rotation.x = Math.sin(this.phase) * 0.55 * swing;
    this.hipR.rotation.x = -Math.sin(this.phase) * 0.55 * swing;
    this.kneeL.rotation.x = Math.max(0, -Math.sin(this.phase - 0.6)) * 0.9 * swing;
    this.kneeR.rotation.x = Math.max(0, Math.sin(this.phase - 0.6)) * 0.9 * swing;

    // Arms counter-swing against the hips.
    this.shoulderL.rotation.x = -Math.sin(this.phase) * 0.35 * swing;
    this.shoulderR.rotation.x = Math.sin(this.phase) * 0.35 * swing;
    this.elbowL.rotation.x = -Math.abs(Math.sin(this.phase)) * 0.25 * swing;
    this.elbowR.rotation.x = -Math.abs(Math.sin(this.phase + Math.PI)) * 0.25 * swing;

    // Two bobs per stride, plus breathing that never fully stops.
    const breathe = Math.sin(performance.now() * 0.0015) * 0.008;
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.035 * swing + breathe;
    this.body.rotation.z = Math.sin(this.phase) * 0.02 * swing;

    if (this.state === "speaking" || this.state === "gesturing") {
      const t = performance.now() * 0.002;
      this.head.rotation.x = Math.sin(t * 1.7) * 0.06;
      this.head.rotation.z = Math.sin(t * 0.9) * 0.04;
      if (this.state === "gesturing") {
        this.shoulderR.rotation.x = -0.5 + Math.sin(t * 2.2) * 0.25;
        this.elbowR.rotation.x = -0.7 + Math.sin(t * 2.2 + 0.5) * 0.2;
      }
    } else {
      this.head.rotation.x *= 1 - Math.min(1, dt * 4);
      this.head.rotation.z *= 1 - Math.min(1, dt * 4);
    }

    // Face the user when not walking. Zeroing Y matters — a lookAt at eye
    // height tips the whole figure backwards.
    if (!walking) {
      const flat = new THREE.Vector3(lookAt.x, this.object.position.y, lookAt.z);
      const direction = flat.sub(this.object.position);
      if (direction.lengthSq() > 1e-6) {
        this.targetQuaternion.setFromEuler(
          new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0)
        );
      }
    }
    this.object.quaternion.slerp(this.targetQuaternion, Math.min(1, dt * 4));

    if (this.shadow) {
      this.shadow.position.y = 0.01 - this.body.position.y * 0.5;
    }
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) {
      const asStandard = material as THREE.MeshBasicMaterial;
      asStandard.map?.dispose();
      material.dispose();
    }
    this.geometries = [];
    this.materials = [];
    this.object.clear();
  }
}
