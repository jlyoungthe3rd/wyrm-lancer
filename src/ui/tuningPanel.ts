import type { ControlScheme } from '../engine/touchInput';
import { cloneTuning, DEFAULT_TUNING, type TuningConfig } from '../engine/tuning';
import type { WorldState } from '../game/types';
import { respawnAllEnemies, warpToZone } from '../game/world';
import type { DebugRenderOptions } from '../render/debugRenderer';

export interface TuningPanelCallbacks {
  initialSwapHands: boolean;
  onSpeedChange: (speed: number) => void;
  onToggleMute: () => void;
  onToggleControlScheme: (enabled: boolean) => void;
  onToggleSwapHands: (swap: boolean) => void;
  onClose: () => void;
}

interface SliderSpec {
  key: keyof TuningConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDER_GROUPS: Array<{ title: string; items: SliderSpec[] }> = [
  {
    title: 'Movement & Jump',
    items: [
      { key: 'runSpeed', label: 'Run Speed', min: 160, max: 480, step: 10, unit: 'px/s' },
      { key: 'gravity', label: 'Gravity', min: 900, max: 2400, step: 20 },
      { key: 'jumpVelocity', label: 'Jump Velocity', min: -850, max: -380, step: 10 },
      { key: 'coyoteTime', label: 'Coyote Time', min: 0.02, max: 0.22, step: 0.01, unit: 's' },
    ],
  },
  {
    title: 'Lance & Pogo',
    items: [
      { key: 'thrustReach', label: 'Thrust Reach', min: 45, max: 115, step: 2, unit: 'px' },
      { key: 'pogoBounceVelocity', label: 'Pogo Bounce Vy', min: -760, max: -320, step: 10 },
      { key: 'hitstopScale', label: 'Hitstop Scale', min: 0, max: 2, step: 0.1, unit: 'x' },
    ],
  },
  {
    title: 'High Jump (Signature)',
    items: [
      { key: 'hjAscentVelocity', label: 'Ascent Vy', min: -1400, max: -650, step: 20 },
      { key: 'hjApexDuration', label: 'Apex Hang Time', min: 0.15, max: 1.0, step: 0.05, unit: 's' },
      { key: 'hjDiveSpeed', label: 'Dive Speed', min: 750, max: 1700, step: 25, unit: 'px/s' },
      { key: 'hjMaxDiveAngleDeg', label: 'Max Steer Angle', min: 10, max: 60, step: 2, unit: '°' },
      { key: 'hjLockOnRange', label: 'Lock-On Range', min: 250, max: 760, step: 10, unit: 'px' },
    ],
  },
  {
    title: 'Elusive Jump',
    items: [
      { key: 'elusiveVx', label: 'Backflip Vx', min: 320, max: 780, step: 10 },
      { key: 'elusiveVy', label: 'Backflip Vy', min: -560, max: -180, step: 10 },
      { key: 'elusiveCooldown', label: 'Cooldown', min: 0.4, max: 3.0, step: 0.1, unit: 's' },
    ],
  },
  {
    title: 'Touch Hop-Swipe Physics',
    items: [
      { key: 'touchSwipeThresholdPx', label: 'Swipe Threshold', min: 12, max: 60, step: 2, unit: 'px' },
      { key: 'touchHopVx', label: 'Ground Hop Vx', min: 140, max: 420, step: 10, unit: 'px/s' },
      { key: 'touchHopVy', label: 'Ground Hop Vy', min: -560, max: -220, step: 10 },
      { key: 'touchSingleJumpVy', label: 'Single Jump Vy', min: -800, max: -420, step: 10 },
      { key: 'touchAirHopVx', label: 'Air Hop Vx', min: 160, max: 460, step: 10, unit: 'px/s' },
      { key: 'touchAirHopVy', label: 'Air Hop Vy', min: -600, max: -240, step: 10 },
      { key: 'touchDoubleJumpVy', label: 'Double Jump Vy', min: -760, max: -360, step: 10 },
      { key: 'touchApexFloatDuration', label: 'Apex Float Window', min: 0, max: 0.65, step: 0.02, unit: 's' },
      { key: 'touchFastFallVy', label: 'Fast-Fall Vy', min: 480, max: 1150, step: 20 },
      { key: 'touchMaxAirHopCharges', label: 'Max Air Charges', min: 1, max: 3, step: 1 },
    ],
  },
];

export class TuningPanel {
  private container: HTMLElement;
  private isOpen = false;
  private sliderInputs = new Map<keyof TuningConfig, { input: HTMLInputElement; valEl: HTMLElement; unit: string }>();
  private speedButtons: HTMLButtonElement[] = [];
  private touchModeCheckbox!: HTMLInputElement;

  constructor(
    container: HTMLElement,
    private world: WorldState,
    private debugOpts: DebugRenderOptions,
    private callbacks: TuningPanelCallbacks,
  ) {
    this.container = container;
    this.render();
  }

  get open(): boolean {
    return this.isOpen;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    this.container.classList.toggle('collapsed', !this.isOpen);
    if (!this.isOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  setOpen(open: boolean): void {
    this.isOpen = open;
    this.container.classList.toggle('collapsed', !this.isOpen);
    if (!this.isOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  syncControlScheme(scheme: ControlScheme): void {
    if (this.touchModeCheckbox) {
      this.touchModeCheckbox.checked = scheme === 'touch';
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'tuning-header';
    header.innerHTML = `<h2>Dragoon Mechanics Lab</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tune-btn';
    closeBtn.textContent = 'Close [Tab]';
    closeBtn.addEventListener('click', () => {
      closeBtn.blur();
      this.setOpen(false);
      this.callbacks.onClose();
    });
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tuning-body';

    // 1. Zone Warps & Respawn
    const warpSec = document.createElement('div');
    warpSec.className = 'tuning-section';
    warpSec.innerHTML = `<div class="tuning-section-title">Test Zone Warps (Keys 1–6)</div>`;
    const grid = document.createElement('div');
    grid.className = 'btn-grid';
    const shortLabels = ['1: Lance', '2: Spire', '3: Chasm', '4: Wyverns', '5: Altar', '6: Boss'];
    shortLabels.forEach((lbl, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tune-btn';
      btn.textContent = lbl;
      btn.addEventListener('click', () => {
        btn.blur();
        warpToZone(this.world, idx + 1);
      });
      grid.appendChild(btn);
    });
    warpSec.appendChild(grid);

    const respawnBtn = document.createElement('button');
    respawnBtn.className = 'tune-btn';
    respawnBtn.textContent = 'Respawn All Enemies & Cracked Floors';
    respawnBtn.addEventListener('click', () => {
      respawnBtn.blur();
      respawnAllEnemies(this.world);
    });
    warpSec.appendChild(respawnBtn);
    body.appendChild(warpSec);

    // 2. Debug Overlays & Time Scale
    const dbgSec = document.createElement('div');
    dbgSec.className = 'tuning-section';
    dbgSec.innerHTML = `<div class="tuning-section-title">Diagnostics & Slow-Mo</div>`;

    const addToggle = (
      parent: HTMLElement,
      label: string,
      checked: boolean,
      onChange: (v: boolean) => void,
    ): HTMLInputElement => {
      const row = document.createElement('label');
      row.className = 'tune-toggle';
      row.innerHTML = `<span>${label}</span>`;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.addEventListener('change', () => {
        cb.blur();
        onChange(cb.checked);
      });
      row.appendChild(cb);
      parent.appendChild(row);
      return cb;
    };

    // 1b. Touch Controls Section
    const touchSec = document.createElement('div');
    touchSec.className = 'tuning-section';
    touchSec.innerHTML = `<div class="tuning-section-title">Touch Controls (Mobile)</div>`;
    this.touchModeCheckbox = addToggle(
      touchSec,
      'Touch Mode (Hop-Swipe)',
      this.world.controlScheme === 'touch',
      (v) => this.callbacks.onToggleControlScheme(v),
    );
    addToggle(
      touchSec,
      'Swap Left / Right Hands',
      this.callbacks.initialSwapHands,
      (v) => this.callbacks.onToggleSwapHands(v),
    );
    body.appendChild(touchSec);

    addToggle(dbgSec, 'Show Hitboxes & Hurtboxes', this.debugOpts.showHitboxes, (v) => {
      this.debugOpts.showHitboxes = v;
    });
    addToggle(dbgSec, 'Show High Jump Lock Cone', this.debugOpts.showLockCone, (v) => {
      this.debugOpts.showLockCone = v;
    });
    addToggle(dbgSec, 'Show State & Velocity Readout', this.debugOpts.showStateInfo, (v) => {
      this.debugOpts.showStateInfo = v;
    });

    const speedRow = document.createElement('div');
    speedRow.className = 'btn-row';
    [0.25, 0.5, 1.0].forEach((spd) => {
      const btn = document.createElement('button');
      btn.className = `tune-btn${spd === 1.0 ? ' active' : ''}`;
      btn.textContent = `${spd}x Speed`;
      btn.addEventListener('click', () => {
        btn.blur();
        this.speedButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onSpeedChange(spd);
      });
      this.speedButtons.push(btn);
      speedRow.appendChild(btn);
    });
    dbgSec.appendChild(speedRow);
    body.appendChild(dbgSec);

    // 3. Sandbox Cheats
    const cheatSec = document.createElement('div');
    cheatSec.className = 'tuning-section';
    cheatSec.innerHTML = `<div class="tuning-section-title">Sandbox Cheats</div>`;
    addToggle(cheatSec, 'Infinite Dragon Gauge (100)', this.world.cheats.infiniteGauge, (v) => {
      this.world.cheats.infiniteGauge = v;
    });
    addToggle(cheatSec, 'Zero Cooldowns & Infinite Air Charges', this.world.cheats.zeroCooldowns, (v) => {
      this.world.cheats.zeroCooldowns = v;
    });
    addToggle(cheatSec, 'God Mode (Ignore Damage)', this.world.cheats.godMode, (v) => {
      this.world.cheats.godMode = v;
    });
    body.appendChild(cheatSec);

    // 4. Live Parameter Sliders
    for (const group of SLIDER_GROUPS) {
      const sec = document.createElement('div');
      sec.className = 'tuning-section';
      sec.innerHTML = `<div class="tuning-section-title">${group.title}</div>`;

      for (const spec of group.items) {
        const row = document.createElement('div');
        row.className = 'slider-row';
        const label = document.createElement('div');
        label.className = 'slider-label';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = spec.label;
        const valEl = document.createElement('strong');
        const unit = spec.unit ? ` ${spec.unit}` : '';
        valEl.textContent = `${this.world.tuning[spec.key]}${unit}`;
        label.append(nameSpan, valEl);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(spec.min);
        input.max = String(spec.max);
        input.step = String(spec.step);
        input.value = String(this.world.tuning[spec.key]);
        input.addEventListener('input', () => {
          const val = Number(input.value);
          this.world.tuning[spec.key] = val;
          valEl.textContent = `${val}${unit}`;
        });
        input.addEventListener('change', () => input.blur());

        this.sliderInputs.set(spec.key, { input, valEl, unit });
        row.append(label, input);
        sec.appendChild(row);
      }
      body.appendChild(sec);
    }

    this.container.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'tuning-footer';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'tune-btn';
    resetBtn.textContent = 'Reset Defaults';
    resetBtn.addEventListener('click', () => {
      resetBtn.blur();
      Object.assign(this.world.tuning, cloneTuning(DEFAULT_TUNING));
      this.syncSlidersFromWorld();
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'tune-btn';
    copyBtn.textContent = 'Copy Tuning JSON';
    copyBtn.addEventListener('click', () => {
      copyBtn.blur();
      const json = JSON.stringify(this.world.tuning, null, 2);
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(json);
      }
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Tuning JSON';
      }, 1200);
    });

    footer.append(resetBtn, copyBtn);
    this.container.appendChild(footer);
  }

  private syncSlidersFromWorld(): void {
    for (const [key, entry] of this.sliderInputs.entries()) {
      const val = this.world.tuning[key];
      entry.input.value = String(val);
      entry.valEl.textContent = `${val}${entry.unit}`;
    }
  }
}
