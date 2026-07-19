import * as THREE from "three";
import type { AgentIdentity } from "@/lib/agents";
import type { GuideState } from "@/lib/walk/walk-script";
import type { ScenePalette } from "@/lib/walk/scene-palette";
import type { GuideAvatar } from "@/components/walk/guide-avatar";

// A rigged humanoid loaded from a .glb — Ready Player Me avatars, or anything
// else with a compatible skeleton. Nothing here is required to exist: if the
// files are absent the walk keeps the procedural guide, exactly as a missing
// photosphere keeps the procedural sky.

/** Avatar per gender. Ready Player Me exports drop straight in here. */
export function avatarPath(identity: AgentIdentity): string {
  return `/models/guides/${identity.gender}.glb`;
}

// Clips must ship inside the avatar file itself. There used to be a shared
// animation library retargeted across rigs here; it is gone deliberately.
// Even rigs that look like the same family disagree about bone rest
// orientations (a nominally-Mixamo pair measured 131° apart at the
// shoulders), and every retargeting scheme we tried turned that mismatch
// into mangled limbs. Bundled clips are authored against their own skeleton
// and cannot break that way.

// Adult eye-ish height in metres. Sources disagree on units — Ready Player Me
// exports at 1:1, Mixamo at 1:100 — and for a skinned mesh the raw accessor
// bounds do not predict the rendered size anyway. Measuring after load and
// normalising is the only thing that works across both.
const TARGET_HEIGHT = 1.75;

const CROSSFADE_SECONDS = 0.25;

export class GltfGuide implements GuideAvatar {
  readonly object = new THREE.Group();

  private mixer: THREE.AnimationMixer;
  private actions = new Map<GuideState, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private state: GuideState = "idle";
  private targetQuaternion = new THREE.Quaternion();
  private model: THREE.Object3D;
  private disposed = false;

  constructor(model: THREE.Object3D, clips: Map<GuideState, THREE.AnimationClip>) {
    this.model = model;
    faceForward(model);
    this.object.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    for (const [state, clip] of clips) {
      this.actions.set(state, this.mixer.clipAction(clip));
    }
    this.setState("idle");
  }

  setState(state: GuideState) {
    this.state = state;
    const next = this.actions.get(state);
    if (!next || next === this.current) return;

    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(CROSSFADE_SECONDS).play();
    this.current?.fadeOut(CROSSFADE_SECONDS);
    this.current = next;
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

    this.object.position.copy(points[index].clone().lerp(points[index + 1], local));

    const heading = points[index + 1].clone().sub(points[index]);
    if (heading.lengthSq() > 1e-6) {
      this.targetQuaternion.setFromEuler(
        new THREE.Euler(0, Math.atan2(heading.x, heading.z), 0)
      );
    }
  }

  update(dt: number, lookAt: THREE.Vector3) {
    this.mixer.update(dt);

    if (this.state !== "walking") {
      // Zero out Y — facing a camera at eye height would tip the model back.
      const flat = new THREE.Vector3(lookAt.x, this.object.position.y, lookAt.z);
      const direction = flat.sub(this.object.position);
      if (direction.lengthSq() > 1e-6) {
        this.targetQuaternion.setFromEuler(
          new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0)
        );
      }
    }
    this.object.quaternion.slerp(this.targetQuaternion, Math.min(1, dt * 4));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);

    this.model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      for (const material of materialsOf(mesh)) {
        for (const key of [
          "map",
          "normalMap",
          "roughnessMap",
          "metalnessMap",
          "emissiveMap",
          "aoMap",
        ] as const) {
          (material as THREE.MeshStandardMaterial)[key]?.dispose();
        }
        material.dispose();
      }
    });
    this.object.clear();
  }
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/**
 * Attempts to load a rigged avatar. Resolves null when no model is present,
 * which is the normal case until someone adds one.
 */
export async function loadGltfGuide(
  identity: AgentIdentity,
  palette: ScenePalette
): Promise<GltfGuide | null> {
  // Only pulled in when a model actually exists, keeping GLTFLoader and its
  // dependencies out of the initial bundle.
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();

  const avatar = await loadOrNull(loader, avatarPath(identity));
  if (!avatar) return null;

  const model = avatar.scene;
  normalizeHeight(model);
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    // Lift the model slightly out of the scene's ambient so it reads against
    // a bright photosphere rather than sinking into it.
    for (const material of materialsOf(mesh)) {
      const standard = material as THREE.MeshStandardMaterial;
      if (standard.emissive) {
        standard.emissive = new THREE.Color(palette.sun).multiplyScalar(0.05);
      }
    }
  });

  const clips = new Map<GuideState, THREE.AnimationClip>();
  for (const state of STATES) {
    const bundled = pickClip(avatar.animations, state);
    if (bundled) clips.set(state, bundled);
  }

  // A guide standing calmly while speaking reads fine; missing talk clips
  // borrow the idle. Missing idle or walk cannot be papered over.
  const idle = clips.get("idle");
  if (idle) {
    if (!clips.has("speaking")) clips.set("speaking", idle);
    if (!clips.has("gesturing")) clips.set("gesturing", clips.get("speaking") ?? idle);
  }

  if (!clips.has("idle") || !clips.has("walking")) {
    // A T-posing or sliding avatar looks more broken than a moving primitive
    // one, so an avatar without its own idle+walk is rejected outright.
    console.debug("[walk] avatar lacks bundled idle/walk clips; keeping procedural guide");
    return null;
  }

  return new GltfGuide(model, clips);
}

type LoadedGltf = { scene: THREE.Group; animations: THREE.AnimationClip[] };

function loadOrNull(
  loader: { load: THREE.Loader["load"] },
  url: string
): Promise<LoadedGltf | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf: unknown) => resolve(gltf as LoadedGltf),
      undefined,
      () => resolve(null)
    );
  });
}

const STATES: GuideState[] = ["idle", "walking", "speaking", "gesturing"];

/**
 * Rotates the model so it faces +Z, which is the direction followPath walks
 * and the face-the-user code assumes.
 *
 * Detected from the skeleton rather than configured: the toes sit forward of
 * the ankles on any humanoid stance, so the ankle→toe direction is the facing.
 * Hardcoding an offset per model is how an avatar ends up walking backwards
 * the day someone swaps the file.
 */
function faceForward(model: THREE.Object3D) {
  model.updateWorldMatrix(true, true);

  const bones: THREE.Object3D[] = [];
  model.traverse((child) => {
    if ((child as THREE.Bone).isBone) bones.push(child);
  });
  const foot = bones.find((b) => /LeftFoot$/i.test(b.name));
  const toe = bones.find((b) => /LeftToe(Base)?(_End)?$/i.test(b.name));
  if (!foot || !toe) return;

  const forward = toe
    .getWorldPosition(new THREE.Vector3())
    .sub(foot.getWorldPosition(new THREE.Vector3()));
  forward.y = 0;
  if (forward.lengthSq() < 1e-8) return;

  // Rotating by -yaw carries the detected forward direction onto +Z.
  model.rotation.y -= Math.atan2(forward.x, forward.z);
}

/**
 * Scales the avatar to a human height and drops its feet to y=0.
 *
 * Without this a Mixamo export lands 1.7cm tall and an RPM one floats, because
 * each toolchain picks its own units and origin.
 */
function normalizeHeight(model: THREE.Object3D) {
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) return;

  const scale = TARGET_HEIGHT / size.y;
  model.scale.multiplyScalar(scale);

  // Re-measure after scaling; the feet must sit on the ground plane, not the
  // model's arbitrary origin.
  model.updateWorldMatrix(true, true);
  const scaled = new THREE.Box3().setFromObject(model);
  model.position.y -= scaled.min.y;
}

/** Matches a clip by name, falling back to the file's only clip. */
function pickClip(
  clips: THREE.AnimationClip[],
  state: GuideState
): THREE.AnimationClip | null {
  if (clips.length === 0) return null;

  const keywords: Record<GuideState, string[]> = {
    idle: ["idle", "stand", "breathing"],
    walking: ["walk", "locomotion"],
    // "agree" is a nod — the closest thing to a talking beat in the library.
    speaking: ["talk", "speak", "agree"],
    gesturing: ["gesture", "point", "talk", "headshake", "agree"],
  };

  for (const keyword of keywords[state]) {
    const match = clips.find((clip) => clip.name.toLowerCase().includes(keyword));
    if (match) return match;
  }
  return clips.length === 1 ? clips[0] : null;
}
