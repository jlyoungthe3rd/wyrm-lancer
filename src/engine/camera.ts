import { clamp, lerp } from './math';

export interface CameraState {
  x: number;
  y: number;
  viewW: number;
  viewH: number;
  shakeMag: number;
  shakeTimer: number;
  shakeDuration: number;
  shakeDirX: number;
  shakeDirY: number;
  lookAheadX: number;
}

export function createCamera(viewW = 1280, viewH = 720): CameraState {
  return {
    x: 0,
    y: 500,
    viewW,
    viewH,
    shakeMag: 0,
    shakeTimer: 0,
    shakeDuration: 0.2,
    shakeDirX: 0,
    shakeDirY: 1,
    lookAheadX: 85,
  };
}

export function addCameraShake(
  cam: CameraState,
  mag: number,
  duration = 0.22,
  dirX = 0,
  dirY = 1,
): void {
  if (mag >= cam.shakeMag || cam.shakeTimer <= 0) {
    cam.shakeMag = mag;
    cam.shakeTimer = duration;
    cam.shakeDuration = duration;
    cam.shakeDirX = dirX;
    cam.shakeDirY = dirY;
  }
}

export function updateCamera(
  cam: CameraState,
  targetX: number,
  targetY: number,
  facing: 1 | -1,
  isHighJumpAir: boolean,
  levelW: number,
  levelH: number,
  dt: number,
): void {
  const desiredLook = facing * 85;
  cam.lookAheadX = lerp(cam.lookAheadX, desiredLook, 1 - Math.exp(-5 * dt));

  const verticalBias = isHighJumpAir ? 95 : -20;
  const desiredX = clamp(targetX + cam.lookAheadX - cam.viewW * 0.5, 0, Math.max(0, levelW - cam.viewW));
  const desiredY = clamp(targetY + verticalBias - cam.viewH * 0.54, 0, Math.max(0, levelH - cam.viewH));

  const factor = 1 - Math.exp(-8.5 * dt);
  cam.x = lerp(cam.x, desiredX, factor);
  cam.y = lerp(cam.y, desiredY, factor);

  if (cam.shakeTimer > 0) {
    cam.shakeTimer = Math.max(0, cam.shakeTimer - dt);
  }
}

export function getCameraShakeOffset(cam: CameraState): { x: number; y: number } {
  if (cam.shakeTimer <= 0 || cam.shakeDuration <= 0) {
    return { x: 0, y: 0 };
  }
  const decay = cam.shakeTimer / cam.shakeDuration;
  const amp = cam.shakeMag * decay;
  const jitterX = (Math.random() * 2 - 1) * amp * 0.55 + cam.shakeDirX * Math.sin(cam.shakeTimer * 85) * amp * 0.6;
  const jitterY = (Math.random() * 2 - 1) * amp * 0.55 + cam.shakeDirY * Math.sin(cam.shakeTimer * 85) * amp * 0.6;
  return { x: jitterX, y: jitterY };
}
