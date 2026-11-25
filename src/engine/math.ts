export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }
  if (current > target) {
    return Math.max(current - maxDelta, target);
  }
  return target;
}

export function rectOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectCenter(r: Rect): Vec2 {
  return { x: r.x + r.w * 0.5, y: r.y + r.h * 0.5 };
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len <= 1e-6) {
    return { x: 0, y: 1 };
  }
  return { x: v.x / len, y: v.y / len };
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Liang-Barsky segment-AABB intersection returning the earliest parametric t in [0, 1],
 * or null if the segment does not intersect the rectangle.
 */
export function segmentIntersectsRect(p1: Vec2, p2: Vec2, r: Rect): number | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - r.x, r.x + r.w - p1.x, p1.y - r.y, r.y + r.h - p1.y];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-8) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }

  return t0 <= t1 ? t0 : null;
}
