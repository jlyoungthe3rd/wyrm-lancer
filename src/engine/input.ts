import type { SwipeDirection } from './touchInput';

export interface InputSnapshot {
  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;
  jumpHeld: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  lancePressed: boolean;
  highJumpHeld: boolean;
  highJumpPressed: boolean;
  highJumpReleased: boolean;
  elusivePressed: boolean;
  lancetPressed: boolean;
  dragonArtPressed: boolean;
  resetPressed: boolean;
  warpZone: number | null;
  touchSwipe: SwipeDirection | null;
}

export function emptyInput(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
    moveX: 0,
    moveY: 0,
    jumpHeld: false,
    jumpPressed: false,
    jumpReleased: false,
    lancePressed: false,
    highJumpHeld: false,
    highJumpPressed: false,
    highJumpReleased: false,
    elusivePressed: false,
    lancetPressed: false,
    dragonArtPressed: false,
    resetPressed: false,
    warpZone: null,
    touchSwipe: null,
    ...overrides,
  };
}

const PREVENT_DEFAULT_CODES = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
]);

interface HeldState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  lance: boolean;
  highJump: boolean;
  elusive: boolean;
  lancet: boolean;
  dragonArt: boolean;
  reset: boolean;
}

export class InputManager {
  private keys = new Set<string>();
  private prev: HeldState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    lance: false,
    highJump: false,
    elusive: false,
    lancet: false,
    dragonArt: false,
    reset: false,
  };

  private pendingWarp: number | null = null;
  private queuedPresses = new Set<keyof HeldState>();
  private queuedReleases = new Set<keyof HeldState>();
  private queuedTouchSwipes: SwipeDirection[] = [];
  private onToggleTuning: (() => void) | null = null;
  private onAnyInteraction: (() => void) | null = null;

  constructor(options: { onToggleTuning?: () => void; onAnyInteraction?: () => void } = {}) {
    this.onToggleTuning = options.onToggleTuning ?? null;
    this.onAnyInteraction = options.onAnyInteraction ?? null;
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
    }
  }

  enqueueTouchSwipe(dir: SwipeDirection): void {
    this.queuedTouchSwipes.push(dir);
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }

  private handleBlur = (): void => {
    this.keys.clear();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.onAnyInteraction?.();

    const activeEl = document.activeElement;
    const insideInput =
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl instanceof HTMLSelectElement;

    if (e.code === 'Tab' || e.code === 'F1') {
      e.preventDefault();
      if (!e.repeat) {
        this.onToggleTuning?.();
      }
      return;
    }

    if (insideInput) {
      if (e.code === 'Escape' && activeEl instanceof HTMLElement) {
        activeEl.blur();
      }
      return;
    }

    if (PREVENT_DEFAULT_CODES.has(e.code)) {
      e.preventDefault();
    }

    if (!e.repeat) {
      if (e.code >= 'Digit1' && e.code <= 'Digit6') {
        this.pendingWarp = Number(e.code.slice(5));
      }
      const action = this.codeToAction(e.code);
      if (action) {
        this.queuedPresses.add(action);
      }
    }

    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    const action = this.codeToAction(e.code);
    if (action) {
      this.queuedReleases.add(action);
    }
  };

  private codeToAction(code: string): keyof HeldState | null {
    switch (code) {
      case 'Space':
      case 'KeyZ':
        return 'jump';
      case 'KeyJ':
      case 'KeyX':
        return 'lance';
      case 'KeyK':
      case 'KeyC':
        return 'highJump';
      case 'KeyL':
      case 'ShiftLeft':
      case 'ShiftRight':
        return 'elusive';
      case 'KeyI':
      case 'KeyV':
        return 'lancet';
      case 'KeyU':
      case 'KeyF':
        return 'dragonArt';
      case 'KeyR':
        return 'reset';
      default:
        return null;
    }
  }

  private readCurrentHeld(): HeldState {
    const k = this.keys;
    const state: HeldState = {
      left: k.has('KeyA') || k.has('ArrowLeft'),
      right: k.has('KeyD') || k.has('ArrowRight'),
      up: k.has('KeyW') || k.has('ArrowUp'),
      down: k.has('KeyS') || k.has('ArrowDown'),
      jump: k.has('Space') || k.has('KeyZ'),
      lance: k.has('KeyJ') || k.has('KeyX'),
      highJump: k.has('KeyK') || k.has('KeyC'),
      elusive: k.has('KeyL') || k.has('ShiftLeft') || k.has('ShiftRight'),
      lancet: k.has('KeyI') || k.has('KeyV'),
      dragonArt: k.has('KeyU') || k.has('KeyF'),
      reset: k.has('KeyR'),
    };

    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (!pad) continue;
        const axX = pad.axes[0] ?? 0;
        const axY = pad.axes[1] ?? 0;
        if (axX < -0.35 || pad.buttons[14]?.pressed) state.left = true;
        if (axX > 0.35 || pad.buttons[15]?.pressed) state.right = true;
        if (axY < -0.35 || pad.buttons[12]?.pressed) state.up = true;
        if (axY > 0.35 || pad.buttons[13]?.pressed) state.down = true;
        if (pad.buttons[0]?.pressed) state.jump = true;
        if (pad.buttons[2]?.pressed) state.lance = true;
        if (pad.buttons[1]?.pressed) state.highJump = true;
        if (pad.buttons[4]?.pressed || pad.buttons[5]?.pressed) state.elusive = true;
        if (pad.buttons[3]?.pressed) state.lancet = true;
        if (pad.buttons[6]?.pressed || pad.buttons[7]?.pressed) state.dragonArt = true;
        if (pad.buttons[9]?.pressed) state.reset = true;
        break;
      }
    }

    return state;
  }

  pollSnapshot(): InputSnapshot {
    const curr = this.readCurrentHeld();

    const pressed = (key: keyof HeldState): boolean =>
      this.queuedPresses.has(key) || (curr[key] && !this.prev[key]);
    const released = (key: keyof HeldState): boolean =>
      this.queuedReleases.has(key) || (!curr[key] && this.prev[key]);

    const moveX: -1 | 0 | 1 = curr.left === curr.right ? 0 : curr.right ? 1 : -1;
    const moveY: -1 | 0 | 1 = curr.up === curr.down ? 0 : curr.down ? 1 : -1;

    const snapshot: InputSnapshot = {
      moveX,
      moveY,
      jumpHeld: curr.jump,
      jumpPressed: pressed('jump'),
      jumpReleased: released('jump'),
      lancePressed: pressed('lance'),
      highJumpHeld: curr.highJump,
      highJumpPressed: pressed('highJump'),
      highJumpReleased: released('highJump'),
      elusivePressed: pressed('elusive'),
      lancetPressed: pressed('lancet'),
      dragonArtPressed: pressed('dragonArt'),
      resetPressed: pressed('reset'),
      warpZone: this.pendingWarp,
      touchSwipe: this.queuedTouchSwipes.shift() ?? null,
    };

    this.prev = curr;
    this.queuedPresses.clear();
    this.queuedReleases.clear();
    this.pendingWarp = null;

    return snapshot;
  }
}
