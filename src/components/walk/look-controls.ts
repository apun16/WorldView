import * as THREE from "three";

// Rotate-in-place look controls. OrbitControls orbits a target, which is wrong
// inside a photosphere; PointerLock is hostile on a page you must escape; and
// FirstPerson translates, which is meaningless in a sphere.

const DAMPING = 8;
const MAX_PITCH = THREE.MathUtils.degToRad(85);
const DRAG_SPEED = 0.0026;
const MIN_FOV = 45;
const MAX_FOV = 90;

type DeviceOrientationPermission = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export class LookControls {
  private targetYaw = 0;
  private targetPitch = 0;
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private pinchDistance = 0;
  private enabled = true;
  private gyroActive = false;
  private gyroQuaternion: THREE.Quaternion | null = null;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private element: HTMLElement
  ) {
    element.style.touchAction = "none";
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerUp);
    element.addEventListener("wheel", this.onWheel, { passive: false });
  }

  /** In XR the headset drives the camera pose; applying our rotation on top
   *  double-rotates and is instantly nauseating. */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.dragging = false;
  }

  /** Points the camera at a target without the user having to find it. */
  lookAt(azimuth: number, elevation: number) {
    this.targetYaw = azimuth;
    this.targetPitch = THREE.MathUtils.clamp(elevation, -MAX_PITCH, MAX_PITCH);
  }

  update(dt: number) {
    if (!this.enabled) return;

    if (this.gyroActive && this.gyroQuaternion) {
      this.camera.quaternion.slerp(this.gyroQuaternion, Math.min(1, dt * DAMPING));
      return;
    }

    const t = Math.min(1, dt * DAMPING);
    this.yaw += (this.targetYaw - this.yaw) * t;
    this.pitch += (this.targetPitch - this.pitch) * t;
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.element.setPointerCapture(event.pointerId);
    this.element.style.cursor = "grabbing";
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragging) return;
    // Drag right → world rotates right, i.e. the camera yaws left.
    this.targetYaw -= (event.clientX - this.lastX) * DRAG_SPEED;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - (event.clientY - this.lastY) * DRAG_SPEED,
      -MAX_PITCH,
      MAX_PITCH
    );
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent) => {
    this.dragging = false;
    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
    this.element.style.cursor = "grab";
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    event.preventDefault();
    this.camera.fov = THREE.MathUtils.clamp(
      this.camera.fov + event.deltaY * 0.02,
      MIN_FOV,
      MAX_FOV
    );
    this.camera.updateProjectionMatrix();
  };

  /** Whether a motion toggle is worth offering at all. */
  static supportsGyro(): boolean {
    return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  }

  /**
   * iOS 13+ requires requestPermission() from inside a user gesture and throws
   * a TypeError otherwise, so this must be called from a click handler.
   */
  async enableGyro(): Promise<boolean> {
    if (!LookControls.supportsGyro()) return false;

    const api = window.DeviceOrientationEvent as unknown as DeviceOrientationPermission;
    if (typeof api.requestPermission === "function") {
      try {
        if ((await api.requestPermission()) !== "granted") return false;
      } catch {
        return false;
      }
    }

    window.addEventListener("deviceorientation", this.onDeviceOrientation);
    this.gyroActive = true;
    return true;
  }

  disableGyro() {
    window.removeEventListener("deviceorientation", this.onDeviceOrientation);
    this.gyroActive = false;
    this.gyroQuaternion = null;
  }

  private onDeviceOrientation = (event: DeviceOrientEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(event.beta),
      THREE.MathUtils.degToRad(event.alpha),
      -THREE.MathUtils.degToRad(event.gamma),
      "YXZ"
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    // Screen is held upright; rotate to match the camera's forward axis.
    quaternion.multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)));
    this.gyroQuaternion = quaternion;
  };

  dispose() {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("wheel", this.onWheel);
    this.disableGyro();
  }
}

type DeviceOrientEvent = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
};
