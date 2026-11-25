import { rectCenter } from '../engine/math';
import { nextId, spawnParticles } from './dragoonAbilities';
import { moveAndCollide } from './physics';
import type { Enemy, EnemyKind, Projectile, WorldState } from './types';

export interface EnemySpec {
  kind: EnemyKind;
  zoneId: number;
  x: number;
  y: number;
  facing?: 1 | -1;
  patrolMinX?: number;
  patrolMaxX?: number;
}

export function createEnemy(id: string, spec: EnemySpec): Enemy {
  const facing = spec.facing ?? -1;
  const base: Enemy = {
    id,
    kind: spec.kind,
    zoneId: spec.zoneId,
    x: spec.x,
    y: spec.y,
    w: 32,
    h: 48,
    vx: 0,
    vy: 0,
    facing,
    hp: 45,
    maxHp: 45,
    stagger: 0,
    maxStagger: 0,
    staggeredTimer: 0,
    alive: true,
    respawnTimer: 0,
    indestructible: false,
    frontShield: false,
    pogoable: true,
    contactDamage: 1,
    aiState: 'IDLE',
    aiTimer: 0,
    telegraphTimer: 0,
    hitFlashTimer: 0,
    hoverPhase: 0,
    homeX: spec.x,
    homeY: spec.y,
    patrolMinX: spec.patrolMinX ?? spec.x - 90,
    patrolMaxX: spec.patrolMaxX ?? spec.x + 90,
    bossMoveIndex: 0,
    bossActivated: false,
    bossAttackKind: null,
    bossShotsFired: 0,
  };

  switch (spec.kind) {
    case 'dummy':
      base.w = 28;
      base.h = 48;
      base.hp = 60;
      base.maxHp = 60;
      base.contactDamage = 0;
      break;
    case 'lantern':
      base.w = 28;
      base.h = 28;
      base.hp = 9999;
      base.maxHp = 9999;
      base.indestructible = true;
      base.contactDamage = 0;
      break;
    case 'beetle':
      base.w = 38;
      base.h = 28;
      base.hp = 42;
      base.maxHp = 42;
      base.aiState = 'PATROL';
      base.vx = facing * 75;
      break;
    case 'shield_knight':
      base.w = 36;
      base.h = 52;
      base.hp = 85;
      base.maxHp = 85;
      base.frontShield = true;
      break;
    case 'turret':
      base.w = 34;
      base.h = 34;
      base.hp = 55;
      base.maxHp = 55;
      base.contactDamage = 0;
      base.aiTimer = 0.6;
      break;
    case 'sentinel':
      base.w = 34;
      base.h = 52;
      base.hp = 90;
      base.maxHp = 90;
      base.aiTimer = 0.8;
      break;
    case 'wyvern':
      base.w = 42;
      base.h = 34;
      base.hp = 54;
      base.maxHp = 54;
      base.aiTimer = 1.1;
      break;
    case 'crystal':
      base.w = 32;
      base.h = 54;
      base.hp = 9999;
      base.maxHp = 9999;
      base.indestructible = true;
      base.contactDamage = 0;
      break;
    case 'iron_wyvern_boss':
      base.w = 88;
      base.h = 72;
      base.hp = 420;
      base.maxHp = 420;
      base.maxStagger = 100;
      base.aiTimer = 1.0;
      break;
  }

  return base;
}

function spawnEnemyProjectile(
  world: WorldState,
  kind: Projectile['kind'],
  x: number,
  y: number,
  w: number,
  h: number,
  vx: number,
  vy: number,
  maxRange: number,
): void {
  world.projectiles.push({
    id: nextId(world, kind),
    owner: 'enemy',
    kind,
    x,
    y,
    w,
    h,
    vx,
    vy,
    damage: 1,
    pierceWalls: false,
    pierceEnemies: false,
    hitIds: [],
    life: 0,
    maxLife: maxRange / Math.max(80, Math.hypot(vx, vy)) + 0.2,
    rangeTraveled: 0,
    maxRange,
  });
}

export function updateEnemies(world: WorldState, dt: number): void {
  const playerCenter = rectCenter(world.player);

  for (const enemy of world.enemies) {
    if (enemy.hitFlashTimer > 0) {
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
    }

    if (!enemy.alive) {
      if (enemy.kind === 'dummy') {
        enemy.respawnTimer -= dt;
        if (enemy.respawnTimer <= 0) {
          enemy.alive = true;
          enemy.hp = enemy.maxHp;
          enemy.x = enemy.homeX;
          enemy.y = enemy.homeY;
          enemy.vx = 0;
          enemy.vy = 0;
          spawnParticles(world, enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, 8, '#38bdf8', 50, 140);
        }
      }
      continue;
    }

    const ec = rectCenter(enemy);
    const distToPlayer = Math.hypot(playerCenter.x - ec.x, playerCenter.y - ec.y);

    switch (enemy.kind) {
      case 'dummy':
      case 'crystal':
        enemy.vx *= Math.max(0, 1 - dt * 10);
        break;

      case 'lantern':
        enemy.hoverPhase += dt * 2.6;
        enemy.y = enemy.homeY + Math.sin(enemy.hoverPhase) * 6;
        break;

      case 'beetle': {
        if (Math.abs(enemy.vx) < 40) {
          enemy.vx = enemy.facing * 75;
        }
        const res = moveAndCollide(enemy, enemy.vx, 320, dt, world.tiles);
        if (enemy.x <= enemy.patrolMinX || res.hitWallLeft) {
          enemy.x = Math.max(enemy.x, enemy.patrolMinX);
          enemy.facing = 1;
          enemy.vx = 75;
        } else if (enemy.x >= enemy.patrolMaxX || res.hitWallRight) {
          enemy.x = Math.min(enemy.x, enemy.patrolMaxX);
          enemy.facing = -1;
          enemy.vx = -75;
        }
        break;
      }

      case 'shield_knight': {
        if (distToPlayer < 460) {
          enemy.facing = playerCenter.x < ec.x ? -1 : 1;
        }
        enemy.vx *= Math.max(0, 1 - dt * 10);
        moveAndCollide(enemy, enemy.vx, 420, dt, world.tiles);
        break;
      }

      case 'turret': {
        if (distToPlayer > 680) break;
        enemy.aiTimer -= dt;
        if (enemy.aiState === 'IDLE' && enemy.aiTimer <= 0) {
          enemy.aiState = 'TELEGRAPH';
          enemy.telegraphTimer = 0.65;
        } else if (enemy.aiState === 'TELEGRAPH') {
          enemy.telegraphTimer -= dt;
          if (enemy.telegraphTimer <= 0) {
            spawnEnemyProjectile(
              world,
              'turret_wave',
              enemy.facing === 1 ? enemy.x + enemy.w : enemy.x - 42,
              enemy.y + 4,
              42,
              26,
              enemy.facing * 350,
              0,
              520,
            );
            enemy.aiState = 'IDLE';
            enemy.aiTimer = 1.75;
          }
        }
        break;
      }

      case 'sentinel': {
        if (enemy.aiState === 'IDLE') {
          enemy.vx *= Math.max(0, 1 - dt * 10);
          enemy.aiTimer -= dt;
          if (distToPlayer < 440) {
            enemy.facing = playerCenter.x < ec.x ? -1 : 1;
            if (enemy.aiTimer <= 0) {
              enemy.aiState = 'TELEGRAPH';
              enemy.telegraphTimer = 0.55;
            }
          }
        } else if (enemy.aiState === 'TELEGRAPH') {
          enemy.vx = 0;
          enemy.telegraphTimer -= dt;
          if (enemy.telegraphTimer <= 0) {
            enemy.aiState = 'ATTACK';
            enemy.aiTimer = 0.42;
            enemy.vx = enemy.facing * 520;
          }
        } else if (enemy.aiState === 'ATTACK') {
          enemy.aiTimer -= dt;
          if (enemy.x < enemy.patrolMinX && enemy.vx < 0) enemy.vx = 0;
          if (enemy.x > enemy.patrolMaxX && enemy.vx > 0) enemy.vx = 0;
          if (enemy.aiTimer <= 0) {
            enemy.aiState = 'COOLDOWN';
            enemy.aiTimer = 1.1;
            enemy.vx = 0;
          }
        } else if (enemy.aiState === 'COOLDOWN') {
          enemy.vx *= Math.max(0, 1 - dt * 10);
          enemy.aiTimer -= dt;
          if (enemy.aiTimer <= 0) {
            enemy.aiState = 'IDLE';
            enemy.aiTimer = 0.65;
          }
        }
        moveAndCollide(enemy, enemy.vx, 420, dt, world.tiles);
        break;
      }

      case 'wyvern': {
        enemy.hoverPhase += dt * 3;
        const targetY = enemy.homeY + Math.sin(enemy.hoverPhase) * 14;
        enemy.y += (targetY - enemy.y) * Math.min(1, dt * 5);
        enemy.vx *= Math.max(0, 1 - dt * 6);
        enemy.x += enemy.vx * dt;
        enemy.x = Math.max(enemy.patrolMinX, Math.min(enemy.patrolMaxX, enemy.x));

        if (distToPlayer > 620) break;
        enemy.facing = playerCenter.x < ec.x ? -1 : 1;

        if (enemy.aiState === 'IDLE') {
          enemy.aiTimer -= dt;
          if (enemy.aiTimer <= 0) {
            enemy.aiState = 'TELEGRAPH';
            enemy.telegraphTimer = 0.6;
          }
        } else if (enemy.aiState === 'TELEGRAPH') {
          enemy.telegraphTimer -= dt;
          if (enemy.telegraphTimer <= 0) {
            const dx = playerCenter.x - ec.x;
            const dy = playerCenter.y - ec.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            const speed = 260;
            spawnEnemyProjectile(
              world,
              'ember',
              ec.x - 8,
              ec.y - 8,
              16,
              16,
              (dx / len) * speed,
              (dy / len) * speed,
              640,
            );
            enemy.aiState = 'IDLE';
            enemy.aiTimer = 2.1;
          }
        }
        break;
      }

      case 'iron_wyvern_boss': {
        updateIronWyvernBoss(world, enemy, dt, playerCenter.x);
        break;
      }
    }
  }
}

function updateIronWyvernBoss(
  world: WorldState,
  boss: Enemy,
  dt: number,
  playerCenterX: number,
): void {
  if (world.activeZoneId !== 6 && !boss.bossActivated) {
    return;
  }
  boss.bossActivated = true;
  const bc = rectCenter(boss);

  if (boss.aiState === 'STAGGERED') {
    boss.staggeredTimer -= dt;
    boss.vx = 0;
    boss.vy = 420;
    moveAndCollide(boss, 0, boss.vy, dt, world.tiles);
    if (boss.staggeredTimer <= 0) {
      boss.stagger = 0;
      boss.aiState = 'IDLE';
      boss.aiTimer = 0.7;
      boss.bossAttackKind = null;
    }
    return;
  }

  if (boss.aiState === 'IDLE') {
    boss.facing = playerCenterX < bc.x ? -1 : 1;
    boss.vy = 420;
    moveAndCollide(boss, 0, boss.vy, dt, world.tiles);
    boss.aiTimer -= dt;
    if (boss.aiTimer <= 0) {
      const cycle: Array<'flame_sweep' | 'armored_lunge' | 'aerial_barrage'> = [
        'flame_sweep',
        'armored_lunge',
        'aerial_barrage',
      ];
      boss.bossAttackKind = cycle[boss.bossMoveIndex % cycle.length];
      boss.bossMoveIndex += 1;
      boss.bossShotsFired = 0;
      boss.aiState = 'TELEGRAPH';
      boss.telegraphTimer = boss.bossAttackKind === 'flame_sweep' ? 0.75 : 0.65;
    }
    return;
  }

  if (boss.aiState === 'TELEGRAPH') {
    boss.facing = playerCenterX < bc.x ? -1 : 1;
    if (boss.bossAttackKind === 'aerial_barrage') {
      const targetY = boss.homeY - 175;
      boss.y += (targetY - boss.y) * Math.min(1, dt * 6);
    } else {
      moveAndCollide(boss, 0, 420, dt, world.tiles);
    }
    boss.telegraphTimer -= dt;
    if (boss.telegraphTimer <= 0) {
      boss.aiState = 'ATTACK';
      if (boss.bossAttackKind === 'flame_sweep') {
        boss.aiTimer = 0.4;
        spawnEnemyProjectile(
          world,
          'boss_flame',
          boss.facing === 1 ? boss.x + boss.w : boss.x - 56,
          boss.y + boss.h - 38,
          56,
          36,
          boss.facing * 430,
          0,
          760,
        );
      } else if (boss.bossAttackKind === 'armored_lunge') {
        boss.aiTimer = 0.68;
        boss.vx = boss.facing * 560;
      } else {
        boss.aiTimer = 2.1;
      }
    }
    return;
  }

  if (boss.aiState === 'ATTACK') {
    boss.aiTimer -= dt;
    if (boss.bossAttackKind === 'armored_lunge') {
      const res = moveAndCollide(boss, boss.vx, 420, dt, world.tiles);
      if (boss.x < boss.patrolMinX || boss.x > boss.patrolMaxX || res.hitWallLeft || res.hitWallRight) {
        boss.vx = 0;
        boss.x = Math.max(boss.patrolMinX, Math.min(boss.patrolMaxX, boss.x));
      }
    } else if (boss.bossAttackKind === 'aerial_barrage') {
      boss.hoverPhase += dt * 4;
      const hoverY = boss.homeY - 175 + Math.sin(boss.hoverPhase) * 12;
      boss.y += (hoverY - boss.y) * Math.min(1, dt * 6);
      boss.facing = playerCenterX < bc.x ? -1 : 1;
      const elapsed = 2.1 - boss.aiTimer;
      if (boss.bossShotsFired < 3 && elapsed >= boss.bossShotsFired * 0.62 + 0.15) {
        boss.bossShotsFired += 1;
        const pc = rectCenter(world.player);
        const dx = pc.x - bc.x;
        const dy = pc.y - bc.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        spawnEnemyProjectile(
          world,
          'ember',
          bc.x - 9,
          bc.y - 9,
          18,
          18,
          (dx / len) * 290,
          (dy / len) * 290,
          740,
        );
      }
    } else {
      moveAndCollide(boss, 0, 420, dt, world.tiles);
    }

    if (boss.aiTimer <= 0) {
      boss.vx = 0;
      boss.aiState = 'COOLDOWN';
      boss.aiTimer = 0.85;
    }
    return;
  }

  if (boss.aiState === 'COOLDOWN') {
    boss.vy = 420;
    moveAndCollide(boss, 0, boss.vy, dt, world.tiles);
    boss.aiTimer -= dt;
    if (boss.aiTimer <= 0) {
      boss.aiState = 'IDLE';
      boss.aiTimer = 0.65;
      boss.bossAttackKind = null;
    }
  }
}
