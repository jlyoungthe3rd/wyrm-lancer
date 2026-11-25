import { degToRad, normalize, rectCenter, segmentIntersectsRect, type Vec2 } from '../engine/math';
import type { TuningConfig } from '../engine/tuning';
import type {
  ActiveHitbox,
  Enemy,
  Player,
  Projectile,
  TileRect,
  WorldState,
} from './types';

function isLockCandidate(enemy: Enemy): boolean {
  return enemy.alive && enemy.kind !== 'lantern';
}

/**
 * Finds the best enemy target inside the High Jump downward cone.
 * Pressing strongly horizontally away from a candidate breaks lock for manual precision.
 */
export function findHighJumpLockTarget(
  player: Player,
  enemies: Enemy[],
  tuning: TuningConfig,
  inputX: -1 | 0 | 1,
): Enemy | null {
  const origin = rectCenter(player);
  const maxAngleRad = degToRad(tuning.hjLockOnHalfAngleDeg);
  let best: Enemy | null = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    if (!isLockCandidate(enemy)) continue;
    const target = rectCenter(enemy);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    if (dy <= 24) continue;

    const distance = Math.hypot(dx, dy);
    if (distance > tuning.hjLockOnRange) continue;

    const angleFromDown = Math.abs(Math.atan2(dx, dy));
    if (angleFromDown > maxAngleRad) continue;

    // Manual break-lock: if player steers hard opposite the target's horizontal side, skip it
    if (inputX !== 0 && inputX * dx < -22) {
      continue;
    }

    const distScore = distance / tuning.hjLockOnRange;
    const angleScore = angleFromDown / maxAngleRad;
    const directionalBonus = inputX !== 0 && inputX * dx > 12 ? -0.18 : 0;
    const nonCombatPenalty = enemy.kind === 'crystal' ? 0.35 : 0;
    const score = distScore * 0.55 + angleScore * 0.45 + directionalBonus + nonCombatPenalty;

    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  return best;
}

/**
 * Computes normalized dive vector during HJ_APEX from either a locked target or 8-way steering.
 */
export function computeDiveVector(
  player: Player,
  inputX: -1 | 0 | 1,
  lockTarget: Enemy | null,
  tuning: TuningConfig,
): Vec2 {
  if (lockTarget) {
    const origin = rectCenter(player);
    const target = rectCenter(lockTarget);
    return normalize({ x: target.x - origin.x, y: target.y - origin.y });
  }

  const angleRad = inputX * degToRad(tuning.hjMaxDiveAngleDeg);
  return {
    x: Math.sin(angleRad),
    y: Math.cos(angleRad),
  };
}

/**
 * Computes the preview ray endpoint (hitting either locked target, solid tile, or max range)
 * so the renderer can show the dive trajectory cleanly during HJ_APEX.
 */
export function computeDivePreviewEnd(
  origin: Vec2,
  diveDir: Vec2,
  lockTarget: Enemy | null,
  tiles: TileRect[],
  maxDist = 640,
): Vec2 {
  if (lockTarget) {
    return rectCenter(lockTarget);
  }
  const farEnd: Vec2 = {
    x: origin.x + diveDir.x * maxDist,
    y: origin.y + diveDir.y * maxDist,
  };
  let bestT = 1;
  for (const tile of tiles) {
    if (tile.broken) continue;
    if (tile.kind !== 'solid' && tile.kind !== 'cracked') continue;
    const t = segmentIntersectsRect(origin, farEnd, tile);
    if (t !== null && t < bestT) {
      bestT = t;
    }
  }
  return {
    x: origin.x + (farEnd.x - origin.x) * bestT,
    y: origin.y + (farEnd.y - origin.y) * bestT,
  };
}

/**
 * Returns the currently active attack hitbox for THRUST, POGO, HJ_DIVE, or STARDIVER_DIVE.
 */
export function getActiveLanceHitbox(player: Player, tuning: TuningConfig): ActiveHitbox | null {
  if (player.state === 'HJ_DIVE') {
    return {
      rect: {
        x: player.x - 10,
        y: player.y + 4,
        w: player.w + 20,
        h: player.h + 18,
      },
      kind: 'hj_dive',
      damage: tuning.hjBaseDamage,
      staggerDamage: 35,
      isPogo: false,
      armorBreak: true,
      knockbackX: player.hjDiveDir.x * 180,
      knockbackY: -120,
    };
  }

  if (player.state === 'STARDIVER_DIVE') {
    return {
      rect: {
        x: player.x - 14,
        y: player.y,
        w: player.w + 28,
        h: player.h + 24,
      },
      kind: 'stardiver_dive',
      damage: tuning.stardiverDamage,
      staggerDamage: 65,
      isPogo: false,
      armorBreak: true,
      knockbackX: player.facing * 260,
      knockbackY: -160,
    };
  }

  if (player.state !== 'THRUST' && player.state !== 'POGO') {
    return null;
  }

  // Active frames: after startup, before recovery
  const t = player.stateTimer;
  if (t < tuning.thrustStartup || t > tuning.thrustStartup + tuning.thrustActive) {
    return null;
  }

  const kind = player.activeAttackKind ?? 'true_thrust';
  const cx = player.x + player.w * 0.5;
  const cy = player.y + player.h * 0.5;

  if (kind === 'pogo') {
    return {
      rect: {
        x: cx - 18,
        y: player.y + player.h - 4,
        w: 36,
        h: tuning.pogoReach,
      },
      kind,
      damage: tuning.pogoDamage,
      staggerDamage: 14,
      isPogo: true,
      armorBreak: false,
      knockbackX: 0,
      knockbackY: 0,
    };
  }

  if (kind === 'up_thrust') {
    return {
      rect: {
        x: cx - 18,
        y: player.y - tuning.upThrustReach + 8,
        w: 36,
        h: tuning.upThrustReach,
      },
      kind,
      damage: tuning.thrustDamage,
      staggerDamage: 14,
      isPogo: false,
      armorBreak: false,
      knockbackX: player.facing * 60,
      knockbackY: -150,
    };
  }

  const reach = kind === 'vorpal_thrust' ? tuning.vorpalReach : tuning.thrustReach;
  const damage = kind === 'vorpal_thrust' ? tuning.vorpalDamage : tuning.thrustDamage;
  const staggerDamage = kind === 'vorpal_thrust' ? 18 : 10;

  return {
    rect: {
      x: player.facing === 1 ? cx : cx - reach,
      y: cy - 13,
      w: reach,
      h: 26,
    },
    kind,
    damage,
    staggerDamage,
    isPogo: false,
    armorBreak: false,
    knockbackX: player.facing * (kind === 'vorpal_thrust' ? 210 : 120),
    knockbackY: -40,
  };
}

export function nextId(world: WorldState, prefix: string): string {
  world.nextEntityId += 1;
  return `${prefix}-${world.nextEntityId}`;
}

export function spawnLancetProjectile(world: WorldState, inputY: -1 | 0 | 1): void {
  const { player, tuning } = world;
  const origin = rectCenter(player);
  const tiltRad = inputY * degToRad(22);
  const dirX = player.facing * Math.cos(tiltRad);
  const dirY = Math.sin(tiltRad);

  const proj: Projectile = {
    id: nextId(world, 'lancet'),
    owner: 'player',
    kind: 'lancet',
    x: origin.x + player.facing * 12 - 14,
    y: origin.y - 6,
    w: 28,
    h: 12,
    vx: dirX * tuning.lancetSpeed,
    vy: dirY * tuning.lancetSpeed,
    damage: tuning.lancetDamage,
    pierceWalls: false,
    pierceEnemies: false,
    hitIds: [],
    life: 0,
    maxLife: 1.2,
    rangeTraveled: 0,
    maxRange: tuning.lancetRange,
  };

  world.projectiles.push(proj);
  world.events.push('lancet');
}

export function spawnGeirskogulWave(world: WorldState): void {
  const { player, tuning } = world;
  const origin = rectCenter(player);
  const halfH = tuning.geirskogulWidth * 0.5;
  const speed = 1080;

  const proj: Projectile = {
    id: nextId(world, 'geirskogul'),
    owner: 'player',
    kind: 'geirskogul',
    x: origin.x + player.facing * 14 - 22,
    y: origin.y - halfH,
    w: 44,
    h: tuning.geirskogulWidth,
    vx: player.facing * speed,
    vy: 0,
    damage: tuning.geirskogulDamage,
    pierceWalls: true,
    pierceEnemies: true,
    hitIds: [],
    life: 0,
    maxLife: tuning.geirskogulRange / speed + 0.05,
    rangeTraveled: 0,
    maxRange: tuning.geirskogulRange,
  };

  world.projectiles.push(proj);
  world.events.push('geirskogul');
}

export function spawnParticles(
  world: WorldState,
  x: number,
  y: number,
  count: number,
  color: string,
  speedMin: number,
  speedMax: number,
  gravity = 420,
  size = 4,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const maxLife = 0.25 + Math.random() * 0.3;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      size: size * (0.7 + Math.random() * 0.6),
      color,
      alpha: 1,
      life: 0,
      maxLife,
      gravity,
    });
  }
}

export function spawnFloatingText(
  world: WorldState,
  x: number,
  y: number,
  text: string,
  color = '#f8fafc',
  scale = 1,
): void {
  world.floatingTexts.push({
    x,
    y,
    vy: -48,
    text,
    color,
    life: 0,
    maxLife: 0.78,
    scale,
  });
}

export function addDragonGauge(world: WorldState, amount: number): void {
  const { player, tuning } = world;
  player.dragonGauge = Math.min(tuning.gaugeMax, Math.max(0, player.dragonGauge + amount));
}
