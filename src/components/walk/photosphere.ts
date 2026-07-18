import * as THREE from "three";
import type { DestinationId } from "@/lib/destinations";
import type { CountryInfo } from "@/lib/country-index";
import type { TimeOfDay } from "@/lib/local-time";
import { proceduralSky } from "@/components/walk/procedural-sky";
import { scenePalette } from "@/lib/walk/scene-palette";
import { photospherePaths } from "@/lib/walk/scene-locale";

// The environment sphere. Two meshes so a real photo can crossfade in over the
// procedural sky without the user ever seeing a blank frame.

const RADIUS = 500;
const FADE_SECONDS = 0.8;
const LOAD_TIMEOUT_MS = 10_000;

export { photospherePaths };

type Layer = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  /** Loaded textures are ours to dispose; procedural ones are shared and cached. */
  owned: boolean;
};

export class Photosphere {
  readonly group = new THREE.Group();
  private base: Layer;
  private overlay: Layer;
  private fade = 0;
  private fading = false;
  private abort: AbortController | null = null;
  private disposed = false;

  constructor() {
    const geometry = new THREE.SphereGeometry(RADIUS, 60, 40);
    // Flip inward rather than using BackSide — cheaper, and avoids
    // double-sided lighting surprises.
    geometry.scale(-1, 1, 1);

    this.base = this.createLayer(geometry, 1);
    this.overlay = this.createLayer(geometry, 0);
    this.overlay.mesh.visible = false;
    this.group.add(this.base.mesh, this.overlay.mesh);
  }

  private createLayer(geometry: THREE.BufferGeometry, opacity: number): Layer {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1;
    return { mesh, material, owned: false };
  }

  /**
   * Shows a destination immediately using the procedural sky, then attempts to
   * load a real photosphere and crossfades it in if one exists. There is
   * deliberately no loading state — the sphere is never empty.
   */
  show(
    country: CountryInfo,
    destination: DestinationId,
    period: TimeOfDay,
    maxTextureSize = Infinity
  ) {
    this.abort?.abort();
    this.abort = null;

    this.setBaseTexture(proceduralSky(country.iso2, destination, period), false);
    this.overlay.mesh.visible = false;
    this.overlay.material.opacity = 0;
    this.fading = false;
    this.fade = 0;

    // A 4096-wide equirect exceeds the texture limit on plenty of mobile GPUs,
    // where uploading it would fail or silently render black.
    if (maxTextureSize < 4096) {
      console.debug(
        `[walk] max texture size ${maxTextureSize}, staying on procedural sky`
      );
      return;
    }

    this.loadPhoto(country, destination, period);
  }

  private loadPhoto(country: CountryInfo, destination: DestinationId, period: TimeOfDay) {
    const controller = new AbortController();
    this.abort = controller;
    const timeout = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    const candidates = photospherePaths(country, destination);

    const tryNext = (index: number) => {
      if (index >= candidates.length) {
        clearTimeout(timeout);
        // Expected: most countries have no photo. Stay procedural, silently.
        console.debug(`[walk] no photosphere for ${country.iso2}/${destination}, using procedural sky`);
        return;
      }

      new THREE.TextureLoader().load(
        candidates[index],
        (texture) => {
          if (this.disposed || controller.signal.aborted) {
            clearTimeout(timeout);
            texture.dispose();
            return;
          }
          // A missing file is answered with an HTML 404 page, which decodes to
          // nothing — so reaching this callback is not proof of an image.
          if (!texture.image || !texture.image.width) {
            texture.dispose();
            tryNext(index + 1);
            return;
          }

          clearTimeout(timeout);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;

          // Tint toward the local time of day, so one daylight photo can still
          // read as evening in Lima.
          const palette = scenePalette(destination, period);
          this.overlay.material.color
            .set(palette.haze)
            .lerp(new THREE.Color("#ffffff"), 0.72);

          this.swapOverlayTexture(texture, true);
          this.overlay.mesh.visible = true;
          this.fading = true;
        },
        undefined,
        () => tryNext(index + 1)
      );
    };

    tryNext(0);
  }

  update(dt: number) {
    if (!this.fading) return;
    this.fade = Math.min(1, this.fade + dt / FADE_SECONDS);
    this.overlay.material.opacity = this.fade;
    if (this.fade >= 1) {
      this.fading = false;
      // The photo fully covers the sky now — promote it and release the layer,
      // so only one large texture is ever resident.
      const promoted = this.overlay.material.map;
      if (promoted) {
        this.setBaseTexture(promoted, true);
        this.overlay.material.map = null;
        this.overlay.owned = false;
        this.overlay.mesh.visible = false;
        this.overlay.material.opacity = 0;
      }
    }
  }

  private setBaseTexture(texture: THREE.Texture, owned: boolean) {
    if (this.base.owned && this.base.material.map && this.base.material.map !== texture) {
      this.base.material.map.dispose();
    }
    this.base.material.map = texture;
    this.base.material.needsUpdate = true;
    this.base.owned = owned;
  }

  private swapOverlayTexture(texture: THREE.Texture, owned: boolean) {
    if (this.overlay.owned && this.overlay.material.map) {
      this.overlay.material.map.dispose();
    }
    this.overlay.material.map = texture;
    this.overlay.material.needsUpdate = true;
    this.overlay.owned = owned;
  }

  dispose() {
    this.disposed = true;
    this.abort?.abort();

    for (const layer of [this.base, this.overlay]) {
      // Only loaded photos are disposed. Procedural textures are shared across
      // mounts by procedural-sky's cache — disposing one would leave a later
      // walk rendering a black sphere.
      if (layer.owned) layer.material.map?.dispose();
      layer.material.dispose();
    }
    this.base.mesh.geometry.dispose();
    this.group.clear();
  }
}
