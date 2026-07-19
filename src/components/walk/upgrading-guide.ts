import * as THREE from "three";
import type { AgentIdentity } from "@/lib/agents";
import type { GuideState } from "@/lib/walk/walk-script";
import type { ScenePalette } from "@/lib/walk/scene-palette";
import type { GuideAvatar } from "@/components/walk/guide-avatar";
import { createProceduralGuide } from "@/components/walk/procedural-guide";
import { loadGltfGuide } from "@/components/walk/gltf-guide";

/**
 * Shows the procedural guide immediately, then swaps in a rigged avatar if one
 * loads — the same bargain the environment makes: never empty, better when the
 * assets exist. The engine sees one stable GuideAvatar throughout.
 */
export function createUpgradingGuide(
  identity: AgentIdentity,
  palette: ScenePalette,
  accentColor: string
): GuideAvatar {
  return new UpgradingGuide(identity, palette, accentColor);
}

class UpgradingGuide implements GuideAvatar {
  readonly object = new THREE.Group();

  private active: GuideAvatar;
  private disposed = false;

  // Replayed onto the upgraded avatar so a mid-sentence swap keeps its pose.
  private state: GuideState = "idle";
  private path: THREE.Vector3[] = [];
  private pathT = 0;

  constructor(identity: AgentIdentity, palette: ScenePalette, accentColor: string) {
    this.active = createProceduralGuide(identity, palette, accentColor);
    this.object.add(this.active.object);

    loadGltfGuide(identity, palette)
      .then((avatar) => {
        if (!avatar) return;
        if (this.disposed) {
          avatar.dispose();
          return;
        }
        this.swap(avatar);
      })
      .catch(() => {
        // Keep the procedural guide; a missing avatar is the normal case.
      });
  }

  private swap(next: GuideAvatar) {
    const previous = this.active;

    next.object.position.copy(previous.object.position);
    next.object.quaternion.copy(previous.object.quaternion);

    this.object.remove(previous.object);
    this.object.add(next.object);
    this.active = next;

    next.setState(this.state);
    if (this.path.length > 0) next.followPath(this.path, this.pathT);

    previous.dispose();
  }

  setState(state: GuideState) {
    this.state = state;
    this.active.setState(state);
  }

  followPath(points: THREE.Vector3[], t: number) {
    this.path = points;
    this.pathT = t;
    this.active.followPath(points, t);
  }

  update(dt: number, lookAt: THREE.Vector3) {
    this.active.update(dt, lookAt);
  }

  dispose() {
    this.disposed = true;
    this.active.dispose();
    this.object.clear();
  }
}
