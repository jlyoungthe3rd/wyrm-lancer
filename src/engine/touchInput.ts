export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type ControlScheme = 'keyboard' | 'touch';

const STORAGE_SCHEME_KEY = 'dragoon_control_scheme';
const STORAGE_SWAP_KEY = 'dragoon_touch_swap_hands';

/**
 * Maps a drag delta strictly onto the 4 cardinal directions once past thresholdPx.
 */
export function classifyCardinalSwipe(
  dx: number,
  dy: number,
  thresholdPx: number,
): SwipeDirection | null {
  const dist = Math.hypot(dx, dy);
  if (dist < thresholdPx) {
    return null;
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export function detectDefaultControlScheme(): ControlScheme {
  if (typeof window === 'undefined') {
    return 'keyboard';
  }
  try {
    const saved = window.localStorage?.getItem(STORAGE_SCHEME_KEY);
    if (saved === 'keyboard' || saved === 'touch') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0;
  return coarse || maxTouch > 0 ? 'touch' : 'keyboard';
}

export function saveControlScheme(scheme: ControlScheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(STORAGE_SCHEME_KEY, scheme);
  } catch {
    // Ignore storage access errors
  }
}

export function loadSwapHands(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem(STORAGE_SWAP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSwapHands(swap: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(STORAGE_SWAP_KEY, swap ? 'true' : 'false');
  } catch {
    // Ignore storage access errors
  }
}

interface ActivePointer {
  startX: number;
  startY: number;
  triggered: boolean;
}

export interface TouchSwipeControllerOptions {
  target: HTMLElement;
  getEnabled: () => boolean;
  getThresholdPx: () => number;
  getSwapHands: () => boolean;
  onMovementSwipe: (dir: SwipeDirection) => void;
  onAnyInteraction?: () => void;
}

export class TouchSwipeController {
  private pointers = new Map<number, ActivePointer>();
  private opts: TouchSwipeControllerOptions;

  constructor(opts: TouchSwipeControllerOptions) {
    this.opts = opts;
    if (typeof window !== 'undefined') {
      opts.target.addEventListener('pointerdown', this.handlePointerDown);
      window.addEventListener('pointermove', this.handlePointerMove);
      window.addEventListener('pointerup', this.handlePointerEnd);
      window.addEventListener('pointercancel', this.handlePointerEnd);
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      this.opts.target.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerup', this.handlePointerEnd);
      window.removeEventListener('pointercancel', this.handlePointerEnd);
    }
    this.pointers.clear();
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (!this.opts.getEnabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const targetEl = e.target as HTMLElement | null;
    if (
      targetEl?.closest('.hud-quick-actions') ||
      targetEl?.closest('#tuning-drawer') ||
      targetEl?.closest('#rotate-overlay')
    ) {
      return;
    }

    const rect = this.opts.target.getBoundingClientRect();
    const isLeftHalf = e.clientX < rect.left + rect.width * 0.5;
    const isMovementHalf = this.opts.getSwapHands() ? !isLeftHalf : isLeftHalf;
    if (!isMovementHalf) {
      // Right Half (or Left Half when swapped) is reserved for future angled/magnetic combat
      return;
    }

    e.preventDefault();
    this.opts.onAnyInteraction?.();
    this.pointers.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      triggered: false,
    });
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const entry = this.pointers.get(e.pointerId);
    if (!entry || entry.triggered) return;
    if (!this.opts.getEnabled()) {
      this.pointers.delete(e.pointerId);
      return;
    }

    const dir = classifyCardinalSwipe(
      e.clientX - entry.startX,
      e.clientY - entry.startY,
      this.opts.getThresholdPx(),
    );
    if (dir !== null) {
      entry.triggered = true;
      this.opts.onMovementSwipe(dir);
    }
  };

  private handlePointerEnd = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
  };
}
