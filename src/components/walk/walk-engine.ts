import * as THREE from "three";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import type { DialogueBeat, WalkScript } from "@/lib/walk/walk-script";
import { scenePalette } from "@/lib/walk/scene-palette";
import { Photosphere } from "@/components/walk/photosphere";
import { LookControls } from "@/components/walk/look-controls";
import { XRSubtitlePanel } from "@/components/walk/xr-subtitle-panel";
import { createUpgradingGuide } from "@/components/walk/upgrading-guide";
import type { CreateGuide, GuideAvatar } from "@/components/walk/guide-avatar";

export type WalkPhase = "arriving" | "speaking" | "ready" | "leaving" | "complete";

export type WalkHandlers = {
  onPhase(phase: WalkPhase): void;
  onStop(index: number): void;
  onBeat(beat: DialogueBeat | null): void;
  onXRChange(presenting: boolean): void;
  /** The photosphere URL now on screen, or null when using the fallback sky. */
  onPhotoSource(url: string | null): void;
};

export type WalkConfig = {
  country: CountryInfo;
  guide: AgentIdentity;
  script: WalkScript;
  accentColor: string;
  createGuide?: CreateGuide;
  /** When true, skip canned dialogue beats — ElevenLabs drives teaching. */
  skipScriptedBeats?: boolean;
};

const EYE_HEIGHT = 1.6;
const ARRIVE_SECONDS = 2.2;
const LEAVE_SECONDS = 1.4;
const FADE_SECONDS = 0.6;

/**
 * Owns everything three.js for the walk. React holds only narrative/UI state
 * and receives it through `handlers` — no three.js object ever enters React
 * state, which is what keeps the mount effect's dep array honest.
 */
export class WalkEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: LookControls;
  private photosphere = new Photosphere();
  private subtitles: XRSubtitlePanel;
  private guide: GuideAvatar;
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  private fadeSphere: THREE.Mesh;
  private fadeMaterial: THREE.MeshBasicMaterial;
  private resizeObserver: ResizeObserver;

  private stopIndex = 0;
  private beatIndex = 0;
  private phase: WalkPhase = "arriving";
  private phaseElapsed = 0;
  private fadeLevel = 0;
  private fadeDirection: 1 | -1 | 0 = -1;
  private lastFrame = 0;
  private disposed = false;
  private pathPoints: THREE.Vector3[] = [];

  constructor(
    private container: HTMLElement,
    private config: WalkConfig,
    private handlers: WalkHandlers
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType("local-floor");
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.cursor = "grab";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    // Matches the local-floor reference space so desktop and headset agree.
    this.camera.position.set(0, EYE_HEIGHT, 0);

    this.controls = new LookControls(this.camera, this.renderer.domElement);
    this.subtitles = new XRSubtitlePanel(this.renderer.capabilities.getMaxAnisotropy());

    const palette = this.currentPalette();
    this.ambient = new THREE.AmbientLight(0xffffff, palette.ambientIntensity);
    this.sun = new THREE.DirectionalLight(new THREE.Color(palette.sun), palette.sunIntensity);
    this.sun.position.set(3, 6, 2);

    this.guide = (config.createGuide ?? createUpgradingGuide)(
      config.guide,
      palette,
      config.accentColor
    );

    // A fade sphere rather than a DOM overlay — a DOM fade is invisible in
    // immersive mode, exactly when comfort matters most.
    this.fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x05070d,
      transparent: true,
      opacity: 1,
      side: THREE.BackSide,
      depthTest: false,
      fog: false,
    });
    this.fadeSphere = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), this.fadeMaterial);
    this.fadeSphere.renderOrder = 1000;

    this.scene.add(
      this.photosphere.group,
      this.guide.object,
      this.ambient,
      this.sun,
      this.subtitles.group,
      this.fadeSphere
    );

    this.photosphere.onResolved = (url) => this.handlers.onPhotoSource(url);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.renderer.xr.addEventListener("sessionstart", this.onSessionStart);
    this.renderer.xr.addEventListener("sessionend", this.onSessionEnd);

    this.enterStop(0);
    this.renderer.setAnimationLoop(this.frame);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  get xrRenderer() {
    return this.renderer;
  }

  private currentPalette() {
    const stop = this.config.script.stops[this.stopIndex] ?? this.config.script.stops[0];
    return scenePalette(stop.destination);
  }

  private enterStop(index: number) {
    this.stopIndex = index;
    this.beatIndex = 0;

    const stop = this.config.script.stops[index];
    const palette = this.currentPalette();

    this.photosphere.show(
      this.config.country,
      stop.destination,
      this.renderer.capabilities.maxTextureSize
    );

    this.ambient.intensity = palette.ambientIntensity;
    this.sun.color.set(palette.sun);
    this.sun.intensity = palette.sunIntensity;
    this.scene.fog = new THREE.FogExp2(new THREE.Color(palette.haze), 0.012);

    this.pathPoints = stop.path.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.guide.followPath(this.pathPoints, 0);
    this.guide.setState("walking");

    this.setPhase("arriving");
    this.handlers.onStop(index);
    this.emitBeat(null);
    this.fadeDirection = -1;
  }

  private setPhase(phase: WalkPhase) {
    this.phase = phase;
    this.phaseElapsed = 0;
    this.handlers.onPhase(phase);
  }

  private emitBeat(beat: DialogueBeat | null) {
    this.handlers.onBeat(beat);
    this.subtitles.render(beat, this.config.guide.name);
    if (beat?.look) {
      this.controls.lookAt(beat.look.azimuth, beat.look.elevation);
    }
    if (beat) this.guide.setState(beat.guideState);
  }

  /** The single "advance" action, shared by click, tap, Space and XR select. */
  advance() {
    if (this.phase === "arriving") {
      this.startSpeaking();
      return;
    }
    if (this.phase === "speaking") {
      const beats = this.config.script.stops[this.stopIndex].beats;
      if (this.beatIndex < beats.length - 1) {
        this.beatIndex++;
        this.emitBeat(beats[this.beatIndex]);
      } else {
        this.guide.setState("idle");
        this.setPhase("ready");
      }
      return;
    }
    if (this.phase === "ready") {
      const isLast = this.stopIndex >= this.config.script.stops.length - 1;
      this.guide.setState("walking");
      this.setPhase("leaving");
      this.fadeDirection = 1;
      if (isLast) this.pendingComplete = true;
    }
  }

  private pendingComplete = false;
  private pendingGoTo: number | null = null;

  private startSpeaking() {
    if (this.config.skipScriptedBeats) {
      this.guide.setState("idle");
      this.setPhase("ready");
      this.emitBeat(null);
      return;
    }
    this.setPhase("speaking");
    const beats = this.config.script.stops[this.stopIndex].beats;
    this.beatIndex = 0;
    this.emitBeat(beats[0] ?? null);
  }

  /** Agent `show_scene` — fade to a stop on the planned route. */
  goToDestination(destination: string): boolean {
    const index = this.config.script.stops.findIndex(
      (s) => s.destination === destination
    );
    if (index < 0 || index === this.stopIndex) return false;
    if (this.phase === "leaving" || this.phase === "arriving") return false;
    this.pendingComplete = false;
    this.pendingGoTo = index;
    this.guide.setState("walking");
    this.setPhase("leaving");
    this.fadeDirection = 1;
    return true;
  }

  private frame = (time: number) => {
    if (this.disposed) return;
    const dt = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, 0.1) : 0.016;
    this.lastFrame = time;

    this.controls.update(dt);
    this.photosphere.update(dt);
    this.subtitles.update(dt, this.camera);
    this.updatePhase(dt);

    const focus = new THREE.Vector3();
    this.camera.getWorldPosition(focus);
    this.guide.update(dt, focus);

    this.updateFade(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updatePhase(dt: number) {
    this.phaseElapsed += dt;

    if (this.phase === "arriving") {
      // Guide walks in from the far end of the path toward the user.
      const t = Math.min(1, this.phaseElapsed / ARRIVE_SECONDS);
      this.guide.followPath(this.pathPoints, 1 - t);
      if (t >= 1) this.startSpeaking();
      return;
    }

    if (this.phase === "leaving") {
      const t = Math.min(1, this.phaseElapsed / LEAVE_SECONDS);
      this.guide.followPath(this.pathPoints, t);
      if (t >= 1 && this.fadeLevel >= 1) {
        if (this.pendingComplete) {
          this.pendingComplete = false;
          this.pendingGoTo = null;
          this.setPhase("complete");
          this.emitBeat(null);
          this.fadeDirection = -1;
        } else {
          const next = this.pendingGoTo ?? this.stopIndex + 1;
          this.pendingGoTo = null;
          this.enterStop(next);
        }
      }
    }
  }

  private updateFade(dt: number) {
    if (this.fadeDirection === 0) return;
    this.fadeLevel = THREE.MathUtils.clamp(
      this.fadeLevel + (dt / FADE_SECONDS) * this.fadeDirection,
      0,
      1
    );
    this.fadeMaterial.opacity = this.fadeLevel;
    this.fadeSphere.visible = this.fadeLevel > 0.001;
    this.camera.getWorldPosition(this.fadeSphere.position);
    if (this.fadeLevel === 0 || this.fadeLevel === 1) this.fadeDirection = 0;
  }

  private resize() {
    // Resizing while presenting fights the XR framebuffer.
    if (this.renderer.xr.isPresenting) return;
    const { clientWidth, clientHeight } = this.container;
    if (!clientWidth || !clientHeight) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  private onSessionStart = () => {
    this.controls.setEnabled(false);
    this.subtitles.setVisible(true);
    this.handlers.onXRChange(true);
  };

  private onSessionEnd = () => {
    this.controls.setEnabled(true);
    this.subtitles.setVisible(false);
    this.handlers.onXRChange(false);
  };

  enableGyro() {
    return this.controls.enableGyro();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.renderer.xr.removeEventListener("sessionstart", this.onSessionStart);
    this.renderer.xr.removeEventListener("sessionend", this.onSessionEnd);
    this.renderer.xr.getSession()?.end().catch(() => {});

    this.controls.dispose();
    this.photosphere.dispose();
    this.subtitles.dispose();
    this.guide.dispose();

    this.fadeSphere.geometry.dispose();
    this.fadeMaterial.dispose();
    this.scene.clear();

    this.renderer.dispose();
    // Chrome caps live WebGL contexts at ~16; without this, repeated
    // navigation to the walk silently kills the oldest context.
    if (process.env.NODE_ENV === "production") {
      this.renderer.forceContextLoss();
    }
    this.renderer.domElement.remove();
  }
}
