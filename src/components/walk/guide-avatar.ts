import type * as THREE from "three";
import type { AgentIdentity } from "@/lib/agents";
import type { GuideState } from "@/lib/walk/walk-script";
import type { ScenePalette } from "@/lib/walk/scene-palette";

/**
 * The seam between the walk engine and however the guide happens to be drawn.
 *
 * `walk-engine.ts` must depend on this interface only, never on
 * `procedural-guide.ts`. Swapping in a real model later means writing a
 * `gltf-guide.ts` that implements this and passing its factory through — no
 * engine changes.
 */
export interface GuideAvatar {
  readonly object: THREE.Object3D;
  /** Advance animation. `lookAt` is where the guide should face when idle. */
  update(dt: number, lookAt: THREE.Vector3): void;
  setState(state: GuideState): void;
  /** Move along the stop's path, `t` running 0→1. */
  followPath(points: THREE.Vector3[], t: number): void;
  dispose(): void;
}

export type CreateGuide = (
  identity: AgentIdentity,
  palette: ScenePalette,
  accentColor: string
) => GuideAvatar;
