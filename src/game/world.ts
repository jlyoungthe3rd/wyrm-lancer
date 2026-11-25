import { createCamera, updateCamera } from '../engine/camera';
import type { InputSnapshot } from '../engine/input';
import { clamp, rectCenter } from '../engine/math';
import { cloneTuning, DEFAULT_TUNING, type TuningConfig } from '../engine/tuning';
import { resolveCombat } from './combat';
import { updateEnemies } from './enemies';
import { buildLevelEnemies, buildLevelTiles, LEVEL_BLUEPRINT } from './levelData';
import { finalizeDiveGroundImpact, updatePlayer } from './playerState';
import type { Player, WorldState } from './types';

export function createPlayer(spawnX: number, spawnY: number): Player {
  const scarfNodes = [];
  for (let i = 0; i < 6; i++) {
    scarfNodes.push({ x: spawnX + 10 - i * 6, y: spawnY + 14 });
  }

  return {
    x: spawnX,
    y: spawnY,
    w: 28,
    h: 46,
    vx: 0,
    vy: 0,
    facing: 1,
    state: 'IDLE',
    stateTimer: 0,
    grounded: false,
    canCutJump: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    dropThroughTimer: 0,
    invulnTimer: 0,
    hurtFlashTimer: 0,
    evadeTextCooldown: 0,

    hp: 6,
    maxHp: 6,
    dragonGauge: 0,

    comboStep: 0,
    comboWindowTimer: 0,
    airHighJumpAvailable: true,
    airElusiveAvailable: true,

    airHopCharges: DEFAULT_TUNING.touchMaxAirHopCharges,
    apexFloatTimer: 0,
    touchFastFalling: false,
    touchSwipeBufferDir: null,
    touchSwipeBufferTimer: 0,

    hjCooldown: 0,
    elusiveCooldown: 0,
    lancetCooldown: 0,

    hjStartY: spawnY,
    hjApexStartY: spawnY,
    hjDiveDir: { x: 0, y: 1 },
    hjLockTargetId: null,
    hjManualOverride: false,
    hjDiveTriggeredSound: false,

    lancetSpawned: false,
    geirskogulSpawned: false,

    activeAttackKind: null,
    attackHitIds: [],

    lastSafeX: spawnX,
    lastSafeY: spawnY,

    scarfNodes,
    afterimages: [],
  };
}

export function createWorld(tuning: TuningConfig = cloneTuning(DEFAULT_TUNING)): WorldState {
  const startZone = LEVEL_BLUEPRINT.zones[0];
  const cam = createCamera(1280, 720);
  cam.x = 0;
  cam.y = clamp(startZone.spawnY - 420, 0, LEVEL_BLUEPRINT.height - cam.viewH);

  return {
    player: createPlayer(startZone.spawnX, startZone.spawnY),
    tiles: buildLevelTiles(),
    enemies: buildLevelEnemies(),
    projectiles: [],
    drainOrbs: [],
    shockwaves: [],
    particles: [],
    floatingTexts: [],
    zones: LEVEL_BLUEPRINT.zones.map((z) => ({ ...z })),
    signposts: LEVEL_BLUEPRINT.signposts.map((s) => ({ ...s, lines: [...s.lines] })),
    activeZoneId: 1,
    zoneBannerTimer: 2.8,
    levelWidth: LEVEL_BLUEPRINT.width,
    levelHeight: LEVEL_BLUEPRINT.height,
    hitstopTimer: 0,
    time: 0,
    nextEntityId: 100,
    tuning,
    controlScheme: 'keyboard',
    cheats: {
      infiniteGauge: false,
      zeroCooldowns: false,
      godMode: false,
    },
    events: [],
    camera: cam,
  };
}

export function warpToZone(world: WorldState, zoneId: number): void {
  const zone = world.zones.find((z) => z.id === zoneId);
  if (!zone) return;

  const { player } = world;
  player.x = zone.spawnX;
  player.y = zone.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.state = 'IDLE';
  player.stateTimer = 0;
  player.activeAttackKind = null;
  player.airHighJumpAvailable = true;
  player.airElusiveAvailable = true;
  player.airHopCharges = world.tuning.touchMaxAirHopCharges;
  player.apexFloatTimer = 0;
  player.touchFastFalling = false;
  player.touchSwipeBufferDir = null;
  player.touchSwipeBufferTimer = 0;
  player.lastSafeX = zone.spawnX;
  player.lastSafeY = zone.spawnY;
  player.hp = player.maxHp;
  player.invulnTimer = 0.35;
  player.afterimages = [];
  for (let i = 0; i < player.scarfNodes.length; i++) {
    player.scarfNodes[i].x = zone.spawnX + 10 - i * 6;
    player.scarfNodes[i].y = zone.spawnY + 14;
  }

  world.projectiles = [];
  world.drainOrbs = [];
  world.activeZoneId = zone.id;
  world.zoneBannerTimer = 2.8;

  world.camera.x = clamp(zone.spawnX - world.camera.viewW * 0.35, 0, world.levelWidth - world.camera.viewW);
  world.camera.y = clamp(zone.spawnY - world.camera.viewH * 0.55, 0, world.levelHeight - world.camera.viewH);
}

export function respawnAllEnemies(world: WorldState): void {
  const currentGauge = world.player.dragonGauge;
  world.enemies = buildLevelEnemies();
  for (const tile of world.tiles) {
    if (tile.kind === 'cracked') {
      tile.broken = false;
    }
  }
  world.projectiles = [];
  world.drainOrbs = [];
  world.player.dragonGauge = currentGauge;
}

export function resetCurrentZone(world: WorldState): void {
  const zoneId = world.activeZoneId;
  const freshEnemies = buildLevelEnemies().filter((e) => e.zoneId === zoneId);
  world.enemies = world.enemies.filter((e) => e.zoneId !== zoneId).concat(freshEnemies);
  for (const tile of world.tiles) {
    if (tile.kind === 'cracked' && tile.zoneId === zoneId) {
      tile.broken = false;
    }
  }
  warpToZone(world, zoneId);
}

function updateVfx(world: WorldState, dt: number): void {
  for (let i = world.shockwaves.length - 1; i >= 0; i--) {
    const sw = world.shockwaves[i];
    const growSpeed = sw.isStardiver ? 620 : 420;
    sw.radius += growSpeed * dt;
    sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
    if (sw.radius >= sw.maxRadius) {
      world.shockwaves.splice(i, 1);
    }
  }

  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life += dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      world.particles.splice(i, 1);
    }
  }

  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.life += dt;
    ft.y += ft.vy * dt;
    ft.vy *= Math.max(0, 1 - dt * 3);
    if (ft.life >= ft.maxLife) {
      world.floatingTexts.splice(i, 1);
    }
  }
}

export function stepWorld(world: WorldState, input: InputSnapshot, dt: number): void {
  world.events = [];

  if (input.warpZone !== null) {
    warpToZone(world, input.warpZone);
    return;
  }

  if (input.resetPressed) {
    resetCurrentZone(world);
    return;
  }

  world.time += dt;
  world.zoneBannerTimer = Math.max(0, world.zoneBannerTimer - dt);

  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    updateVfx(world, dt * 0.25);
    const pc = rectCenter(world.player);
    updateCamera(
      world.camera,
      pc.x,
      pc.y,
      world.player.facing,
      false,
      world.levelWidth,
      world.levelHeight,
      dt,
    );
    return;
  }

  updatePlayer(world, input, dt);
  updateEnemies(world, dt);
  resolveCombat(world, dt, input.moveX);
  finalizeDiveGroundImpact(world);
  updateVfx(world, dt);

  // Track active zone transition
  const pc = rectCenter(world.player);
  const currentZone = world.zones.find((z) => pc.x >= z.xStart && pc.x < z.xEnd);
  if (currentZone && currentZone.id !== world.activeZoneId) {
    world.activeZoneId = currentZone.id;
    world.zoneBannerTimer = 2.6;
  }

  const isHjAir =
    world.player.state === 'HJ_ASCENT' ||
    world.player.state === 'HJ_APEX' ||
    world.player.state === 'STARDIVER_ASCENT';
  updateCamera(
    world.camera,
    pc.x,
    pc.y,
    world.player.facing,
    isHjAir,
    world.levelWidth,
    world.levelHeight,
    dt,
  );
}
