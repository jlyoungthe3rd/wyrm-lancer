import { SoundBank } from './engine/audio';
import { emptyInput, InputManager, type InputSnapshot } from './engine/input';
import {
  type ControlScheme,
  detectDefaultControlScheme,
  loadSwapHands,
  saveControlScheme,
  saveSwapHands,
  TouchSwipeController,
} from './engine/touchInput';
import { createWorld, resetCurrentZone, stepWorld } from './game/world';
import type { DebugRenderOptions } from './render/debugRenderer';
import { renderWorld } from './render/renderer';
import { CornerFlashOverlay } from './ui/cornerFlash';
import { HudOverlay } from './ui/hud';
import { TuningPanel } from './ui/tuningPanel';

interface CaptureStatePatch {
  x?: number;
  y?: number;
  facing?: 1 | -1;
  dragonGauge?: number;
  hp?: number;
  tuningOpen?: boolean;
  showHitboxes?: boolean;
  showLockCone?: boolean;
}

interface CaptureController {
  step: (ticks?: number, inputOverrides?: Partial<InputSnapshot>) => void;
  setStateHelper: (patch: CaptureStatePatch) => void;
  getSummary: () => {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: string;
    grounded: boolean;
    facing: 1 | -1;
    hp: number;
    dragonGauge: number;
    activeZoneId: number;
    controlScheme: ControlScheme;
    airHopCharges: number;
    hjCooldown: number;
    elusiveCooldown: number;
    lancetCooldown: number;
    enemies: Array<{
      id: string;
      kind: string;
      zoneId: number;
      x: number;
      y: number;
      w: number;
      h: number;
      hp: number;
      alive: boolean;
      aiState: string;
    }>;
  };
}

declare global {
  interface Window {
    __dragoonCapture?: CaptureController;
  }
}

const FIXED_DT = 1 / 60;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not initialize 2D canvas context.');
}

const viewportWrap = document.getElementById('viewport-wrap') as HTMLElement;
const hudRoot = document.getElementById('hud-root') as HTMLElement;
const cornerFlashLayer = document.getElementById('corner-flash-layer') as HTMLElement;
const rotateDismissBtn = document.getElementById('rotate-dismiss-btn') as HTMLButtonElement | null;
const tuningDrawer = document.getElementById('tuning-drawer') as HTMLElement;

const isCaptureMode = new URLSearchParams(window.location.search).has('capture');

const world = createWorld();
world.controlScheme = isCaptureMode ? 'keyboard' : detectDefaultControlScheme();
document.body.classList.toggle('touch-mode', world.controlScheme === 'touch');

let swapHands = loadSwapHands();
const sfx = new SoundBank();
const debugOpts: DebugRenderOptions = {
  showHitboxes: false,
  showLockCone: false,
  showStateInfo: false,
};

let timeScale = 1.0;

function applyControlScheme(scheme: ControlScheme): void {
  world.controlScheme = scheme;
  world.player.vx = 0;
  world.player.activeAttackKind = null;
  world.player.airHopCharges = world.tuning.touchMaxAirHopCharges;
  world.player.apexFloatTimer = 0;
  world.player.touchFastFalling = false;
  world.player.touchSwipeBufferDir = null;
  world.player.touchSwipeBufferTimer = 0;
  document.body.classList.toggle('touch-mode', scheme === 'touch');
  saveControlScheme(scheme);
  tuningPanel.syncControlScheme(scheme);
}

const tuningPanel = new TuningPanel(tuningDrawer, world, debugOpts, {
  initialSwapHands: swapHands,
  onSpeedChange: (spd) => {
    timeScale = spd;
  },
  onToggleMute: () => {
    sfx.muted = !sfx.muted;
  },
  onToggleControlScheme: (enabled) => {
    applyControlScheme(enabled ? 'touch' : 'keyboard');
  },
  onToggleSwapHands: (swap) => {
    swapHands = swap;
    saveSwapHands(swap);
  },
  onClose: () => {
    canvas.focus();
  },
});

const hud = new HudOverlay(hudRoot, {
  onToggleTuning: () => tuningPanel.toggle(),
  onToggleMute: () => {
    sfx.unlock();
    sfx.muted = !sfx.muted;
  },
  onResetZone: () => {
    resetCurrentZone(world);
    canvas.focus();
  },
  onToggleControlScheme: () => {
    sfx.unlock();
    applyControlScheme(world.controlScheme === 'touch' ? 'keyboard' : 'touch');
    canvas.focus();
  },
});

const cornerFlash = new CornerFlashOverlay(cornerFlashLayer);

const input = new InputManager({
  onToggleTuning: () => tuningPanel.toggle(),
  onAnyInteraction: () => sfx.unlock(),
});

new TouchSwipeController({
  target: viewportWrap,
  getEnabled: () => world.controlScheme === 'touch',
  getThresholdPx: () => world.tuning.touchSwipeThresholdPx,
  getSwapHands: () => swapHands,
  onAnyInteraction: () => sfx.unlock(),
  onMovementSwipe: (dir) => {
    input.enqueueTouchSwipe(dir);
    cornerFlash.pulse(dir);
  },
});

rotateDismissBtn?.addEventListener('click', () => {
  rotateDismissBtn.blur();
  document.body.classList.add('rotate-dismissed');
});

canvas.addEventListener('pointerdown', () => {
  sfx.unlock();
  canvas.focus();
});

let accumulator = 0;
let lastTime = performance.now();

function renderFrame(): void {
  renderWorld(ctx!, world, debugOpts);
  hud.update(world, sfx.muted, tuningPanel.open);
}

if (isCaptureMode) {
  document.body.classList.add('capture-mode');
  renderFrame();

  window.__dragoonCapture = {
    step(ticks = 1, inputOverrides: Partial<InputSnapshot> = {}) {
      for (let i = 0; i < ticks; i++) {
        const snap =
          i === 0
            ? emptyInput(inputOverrides)
            : emptyInput({
                moveX: inputOverrides.moveX ?? 0,
                moveY: inputOverrides.moveY ?? 0,
                jumpHeld: inputOverrides.jumpHeld ?? false,
                highJumpHeld: inputOverrides.highJumpHeld ?? false,
              });
        stepWorld(world, snap, FIXED_DT);
      }
      renderFrame();
    },
    setStateHelper(patch: CaptureStatePatch) {
      if (patch.x !== undefined || patch.y !== undefined) {
        if (patch.x !== undefined) world.player.x = patch.x;
        if (patch.y !== undefined) world.player.y = patch.y;
        world.player.vx = 0;
        world.player.vy = 0;
        world.player.state = 'IDLE';
        world.player.stateTimer = 0;
        world.player.activeAttackKind = null;
        world.player.hjCooldown = 0;
        world.player.elusiveCooldown = 0;
        world.player.lancetCooldown = 0;
        world.player.invulnTimer = 0;
      }
      if (patch.facing !== undefined) world.player.facing = patch.facing;
      if (patch.dragonGauge !== undefined) world.player.dragonGauge = patch.dragonGauge;
      if (patch.hp !== undefined) world.player.hp = patch.hp;
      if (patch.tuningOpen !== undefined) tuningPanel.setOpen(patch.tuningOpen);
      if (patch.showHitboxes !== undefined) debugOpts.showHitboxes = patch.showHitboxes;
      if (patch.showLockCone !== undefined) debugOpts.showLockCone = patch.showLockCone;
      renderFrame();
    },
    getSummary() {
      return {
        x: world.player.x,
        y: world.player.y,
        vx: world.player.vx,
        vy: world.player.vy,
        state: world.player.state,
        grounded: world.player.grounded,
        facing: world.player.facing,
        hp: world.player.hp,
        dragonGauge: world.player.dragonGauge,
        activeZoneId: world.activeZoneId,
        controlScheme: world.controlScheme,
        airHopCharges: world.player.airHopCharges,
        hjCooldown: world.player.hjCooldown,
        elusiveCooldown: world.player.elusiveCooldown,
        lancetCooldown: world.player.lancetCooldown,
        enemies: world.enemies.map((e) => ({
          id: e.id,
          kind: e.kind,
          zoneId: e.zoneId,
          x: e.x,
          y: e.y,
          w: e.w,
          h: e.h,
          hp: e.hp,
          alive: e.alive,
          aiState: e.aiState,
        })),
      };
    },
  };
} else {
  function frame(now: number): void {
    const rawDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    accumulator += rawDt * timeScale;
    while (accumulator >= FIXED_DT) {
      const snap = input.pollSnapshot();
      stepWorld(world, snap, FIXED_DT);
      for (const ev of world.events) {
        sfx.play(ev);
      }
      accumulator -= FIXED_DT;
    }

    renderFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
