import type { WorldState } from '../game/types';

export interface HudCallbacks {
  onToggleTuning: () => void;
  onToggleMute: () => void;
  onResetZone: () => void;
  onToggleControlScheme: () => void;
}

export class HudOverlay {
  private hpPips: HTMLElement[] = [];
  private gaugeHeader: HTMLElement;
  private gaugeStatus: HTMLElement;
  private gaugeFill: HTMLElement;
  private zoneBanner: HTMLElement;
  private bossWrap: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossStaggerFill: HTMLElement;
  private bossStateText: HTMLElement;
  private modeBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private tuningBtn: HTMLButtonElement;

  private slots: {
    hj: { el: HTMLElement; mask: HTMLElement; cd: HTMLElement };
    elusive: { el: HTMLElement; mask: HTMLElement; cd: HTMLElement };
    lancet: { el: HTMLElement; mask: HTMLElement; cd: HTMLElement };
    art: { el: HTMLElement; mask: HTMLElement; cd: HTMLElement; name: HTMLElement };
  };

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    root.innerHTML = `
      <div class="hud-top-row">
        <div class="hud-vitals">
          <div class="hp-row">
            <span class="hp-label">HP</span>
            <div class="hp-pips" id="hud-hp-pips"></div>
          </div>
          <div class="gauge-wrap">
            <div class="gauge-header" id="hud-gauge-header">
              <span>DRAGON GAUGE</span>
              <span class="gauge-status" id="hud-gauge-status">0 / 100</span>
            </div>
            <div class="gauge-track">
              <div class="gauge-fill" id="hud-gauge-fill"></div>
              <div class="gauge-notch" title="50: Geirskogul"></div>
            </div>
          </div>
        </div>

        <div class="hud-center-top">
          <div class="zone-banner" id="hud-zone-banner">Zone 1 — Lance Courtyard</div>
          <div class="boss-bar-wrap" id="hud-boss-wrap" style="display:none;">
            <div class="boss-title">
              <span>IRON WYVERN</span>
              <span id="hud-boss-state">ACTIVE</span>
            </div>
            <div class="boss-hp-track">
              <div class="boss-hp-fill" id="hud-boss-hp" style="width:100%;"></div>
            </div>
            <div class="boss-stagger-track">
              <div class="boss-stagger-fill" id="hud-boss-stagger" style="width:0%;"></div>
            </div>
          </div>
        </div>

        <div class="hud-quick-actions">
          <button class="hud-pill-btn" id="hud-mode-btn" title="Toggle Keyboard / Touch Controls">Mode: KB</button>
          <button class="hud-pill-btn" id="hud-reset-btn" title="Reset Zone [R]">Reset [R]</button>
          <button class="hud-pill-btn" id="hud-mute-btn">SFX: On</button>
          <button class="hud-pill-btn" id="hud-tuning-btn">Tuning [Tab]</button>
        </div>
      </div>

      <div class="hud-bottom-row">
        <div class="ability-bar">
          <div class="ability-slot ready">
            <span class="ability-name">Lance</span>
            <span class="ability-keys">J / X</span>
            <span class="ability-cd-text">Ready</span>
          </div>
          <div class="ability-slot ready" id="slot-hj">
            <div class="ability-cd-mask" style="height:0%;"></div>
            <span class="ability-name">High Jump</span>
            <span class="ability-keys">K / C</span>
            <span class="ability-cd-text">Ready</span>
          </div>
          <div class="ability-slot ready" id="slot-elusive">
            <div class="ability-cd-mask" style="height:0%;"></div>
            <span class="ability-name">Elusive</span>
            <span class="ability-keys">L / Shift</span>
            <span class="ability-cd-text">Ready</span>
          </div>
          <div class="ability-slot ready" id="slot-lancet">
            <div class="ability-cd-mask" style="height:0%;"></div>
            <span class="ability-name">Lancet</span>
            <span class="ability-keys">I / V</span>
            <span class="ability-cd-text">Ready</span>
          </div>
          <div class="ability-slot" id="slot-art">
            <div class="ability-cd-mask" style="height:100%;"></div>
            <span class="ability-name" id="slot-art-name">Dragon Art</span>
            <span class="ability-keys">U / F</span>
            <span class="ability-cd-text">50+ Gauge</span>
          </div>
        </div>
      </div>
    `;

    const pipsContainer = root.querySelector('#hud-hp-pips') as HTMLElement;
    for (let i = 0; i < 6; i++) {
      const pip = document.createElement('div');
      pip.className = 'hp-pip filled';
      pipsContainer.appendChild(pip);
      this.hpPips.push(pip);
    }

    this.gaugeHeader = root.querySelector('#hud-gauge-header') as HTMLElement;
    this.gaugeStatus = root.querySelector('#hud-gauge-status') as HTMLElement;
    this.gaugeFill = root.querySelector('#hud-gauge-fill') as HTMLElement;
    this.zoneBanner = root.querySelector('#hud-zone-banner') as HTMLElement;
    this.bossWrap = root.querySelector('#hud-boss-wrap') as HTMLElement;
    this.bossHpFill = root.querySelector('#hud-boss-hp') as HTMLElement;
    this.bossStaggerFill = root.querySelector('#hud-boss-stagger') as HTMLElement;
    this.bossStateText = root.querySelector('#hud-boss-state') as HTMLElement;
    this.modeBtn = root.querySelector('#hud-mode-btn') as HTMLButtonElement;
    this.muteBtn = root.querySelector('#hud-mute-btn') as HTMLButtonElement;
    this.tuningBtn = root.querySelector('#hud-tuning-btn') as HTMLButtonElement;
    const resetBtn = root.querySelector('#hud-reset-btn') as HTMLButtonElement;

    const getSlot = (id: string) => {
      const el = root.querySelector(id) as HTMLElement;
      return {
        el,
        mask: el.querySelector('.ability-cd-mask') as HTMLElement,
        cd: el.querySelector('.ability-cd-text') as HTMLElement,
      };
    };

    this.slots = {
      hj: getSlot('#slot-hj'),
      elusive: getSlot('#slot-elusive'),
      lancet: getSlot('#slot-lancet'),
      art: {
        ...getSlot('#slot-art'),
        name: root.querySelector('#slot-art-name') as HTMLElement,
      },
    };

    this.modeBtn.addEventListener('click', () => {
      this.modeBtn.blur();
      callbacks.onToggleControlScheme();
    });
    resetBtn.addEventListener('click', () => {
      resetBtn.blur();
      callbacks.onResetZone();
    });
    this.muteBtn.addEventListener('click', () => {
      this.muteBtn.blur();
      callbacks.onToggleMute();
    });
    this.tuningBtn.addEventListener('click', () => {
      this.tuningBtn.blur();
      callbacks.onToggleTuning();
    });
  }

  update(world: WorldState, muted: boolean, tuningOpen: boolean): void {
    const { player, tuning } = world;

    for (let i = 0; i < this.hpPips.length; i++) {
      this.hpPips[i].classList.toggle('filled', i < player.hp);
    }

    const gaugePct = Math.round((player.dragonGauge / tuning.gaugeMax) * 100);
    this.gaugeFill.style.width = `${gaugePct}%`;
    this.gaugeFill.classList.toggle('eye-one', player.dragonGauge >= tuning.geirskogulCost && player.dragonGauge < tuning.stardiverCost);
    this.gaugeFill.classList.toggle('eye-two', player.dragonGauge >= tuning.stardiverCost);
    this.gaugeHeader.classList.toggle('crimson', player.dragonGauge >= tuning.stardiverCost);

    if (player.dragonGauge >= tuning.stardiverCost) {
      this.gaugeStatus.textContent = '100 — STARDIVER READY';
    } else if (player.dragonGauge >= tuning.geirskogulCost) {
      this.gaugeStatus.textContent = `${Math.round(player.dragonGauge)} — GEIRSKOGUL`;
    } else {
      this.gaugeStatus.textContent = `${Math.round(player.dragonGauge)} / ${tuning.gaugeMax}`;
    }

    const zone = world.zones.find((z) => z.id === world.activeZoneId);
    if (zone) {
      this.zoneBanner.textContent =
        world.controlScheme === 'touch' ? zone.name : `${zone.name}  •  1-6 Warp`;
      this.zoneBanner.classList.toggle('subtle', world.zoneBannerTimer <= 0);
    }

    this.modeBtn.textContent = world.controlScheme === 'touch' ? 'Mode: Touch' : 'Mode: KB';
    this.modeBtn.classList.toggle('active', world.controlScheme === 'touch');

    // Boss Bar (Zone 6)
    const boss = world.enemies.find((e) => e.kind === 'iron_wyvern_boss');
    if (boss && world.activeZoneId === 6) {
      this.bossWrap.style.display = 'block';
      this.bossHpFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
      this.bossStaggerFill.style.width = `${Math.min(100, (boss.stagger / Math.max(1, boss.maxStagger)) * 100)}%`;
      this.bossStateText.textContent = !boss.alive
        ? 'VANQUISHED'
        : boss.aiState === 'STAGGERED'
          ? 'STAGGERED (1.5x DMG!)'
          : boss.bossAttackKind
            ? boss.bossAttackKind.replace('_', ' ').toUpperCase()
            : 'ACTIVE';
    } else {
      this.bossWrap.style.display = 'none';
    }

    this.updateCooldownSlot(
      this.slots.hj,
      player.hjCooldown,
      tuning.hjCooldown,
      player.grounded || player.airHighJumpAvailable,
    );
    this.updateCooldownSlot(
      this.slots.elusive,
      player.elusiveCooldown,
      tuning.elusiveCooldown,
      player.grounded || player.airElusiveAvailable,
    );
    this.updateCooldownSlot(this.slots.lancet, player.lancetCooldown, tuning.lancetCooldown, true);

    // Dragon Art Slot
    const art = this.slots.art;
    const hasStardiver = player.dragonGauge >= tuning.stardiverCost;
    const hasGeirskogul = player.dragonGauge >= tuning.geirskogulCost;
    art.el.classList.toggle('crimson-ready', hasStardiver);
    art.el.classList.toggle('ready', hasGeirskogul && !hasStardiver);
    art.el.classList.toggle('on-cd', !hasGeirskogul);
    art.mask.style.height = hasGeirskogul
      ? '0%'
      : `${Math.max(0, 100 - (player.dragonGauge / tuning.geirskogulCost) * 100)}%`;
    art.name.textContent = hasStardiver ? 'Stardiver!' : hasGeirskogul ? 'Geirskogul' : 'Dragon Art';
    art.cd.textContent = hasStardiver ? '100 READY' : hasGeirskogul ? '50 READY' : `${Math.round(player.dragonGauge)}/50`;

    this.muteBtn.textContent = muted ? 'SFX: Off' : 'SFX: On';
    this.tuningBtn.classList.toggle('active', tuningOpen);
  }

  private updateCooldownSlot(
    slot: { el: HTMLElement; mask: HTMLElement; cd: HTMLElement },
    remaining: number,
    total: number,
    airAvailable: boolean,
  ): void {
    const ready = remaining <= 0 && airAvailable;
    slot.el.classList.toggle('ready', ready);
    slot.el.classList.toggle('on-cd', !ready);
    if (remaining > 0 && total > 0) {
      slot.mask.style.height = `${Math.min(100, (remaining / total) * 100)}%`;
      slot.cd.textContent = `${remaining.toFixed(1)}s`;
    } else if (!airAvailable) {
      slot.mask.style.height = '100%';
      slot.cd.textContent = 'Land/Pogo';
    } else {
      slot.mask.style.height = '0%';
      slot.cd.textContent = 'Ready';
    }
  }
}
