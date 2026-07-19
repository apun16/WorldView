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

/**
 * One shared animation library, loaded once. Clips are matched out of it by
 * name and retargeted onto whichever skeleton the avatar uses.
 */
const ANIMATION_LIBRARY = "/models/animations/library.glb";

// Ready Player Me avatars face +Z, which matches how followPath and the
// face-the-user code orient the root. Flip to Math.PI if a model faces away.
const MODEL_FACING_OFFSET = 0;

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
    model.rotation.y = MODEL_FACING_OFFSET;
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
  const skeleton = boneNames(model);

  // Clips bundled inside the avatar itself take priority — they are already
  // authored against its own skeleton.
  for (const state of STATES) {
    const bundled = pickClip(avatar.animations, state);
    if (bundled) clips.set(state, bundled);
  }

  // Anything still missing comes from the shared library, retargeted.
  if (clips.size < STATES.length) {
    const library = await loadOrNull(loader, ANIMATION_LIBRARY);
    if (library) {
      for (const state of STATES) {
        if (clips.has(state)) continue;
        const clip = pickClip(library.animations, state);
        if (clip) clips.set(state, retarget(clip, skeleton));
      }
    }
  }

  if (clips.size === 0) {
    // A T-posing avatar looks more broken than a moving primitive one.
    console.debug("[walk] avatar found but no animations; keeping procedural guide");
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

/** Every bone name in the avatar's skeleton. */
function boneNames(model: THREE.Object3D): Set<string> {
  const names = new Set<string>();
  model.traverse((child) => {
    if ((child as THREE.Bone).isBone) names.add(child.name);
  });
  return names;
}

/**
 * Rebinds a clip onto a skeleton that names its bones differently.
 *
 * Mixamo exports prefix every bone with "mixamorig:"; Ready Player Me avatars
 * use the same hierarchy without it. The bones are otherwise identical, so
 * adding or removing that prefix is all it takes to make a Mixamo clip drive an
 * RPM body.
 *
 * Note the prefix has no colon here. three.js runs every node name through
 * PropertyBinding.sanitizeNodeName, which deletes the characters reserved by
 * its property-path syntax — ":" among them. So by the time a clip reaches us
 * its tracks read "mixamorigHips", never "mixamorig:Hips".
 */
function retarget(
  clip: THREE.AnimationClip,
  skeleton: Set<string>
): THREE.AnimationClip {
  const PREFIX = "mixamorig";
  const retargeted = clip.clone();

  retargeted.tracks = retargeted.tracks.filter((track) => {
    const dot = track.name.indexOf(".");
    if (dot < 0) return true;

    const bone = track.name.slice(0, dot);
    const property = track.name.slice(dot);
    if (skeleton.has(bone)) return true;

    const alternative = bone.startsWith(PREFIX)
      ? bone.slice(PREFIX.length)
      : PREFIX + bone;
    // Tracks that still do not resolve would bind to nothing and silently
    // freeze that limb, so drop them.
    if (!skeleton.has(alternative)) return false;

    track.name = alternative + property;
    return true;
  });

  return retargeted;
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
