import { addCameraShake } from '../engine/camera';
import { dist, rectCenter, rectOverlap, type Rect } from '../engine/math';
import {
  addDragonGauge,
  getActiveLanceHitbox,
  nextId,
  spawnFloatingText,
  spawnParticles,
} from './dragoonAbilities';
import { isPointInsideSolidTile } from './physics';
import type { Enemy, Projectile, WorldState } from './types';

function pushOutOfPit(world: WorldState): void {
  const { player } = world;
  player.x = player.lastSafeX;
  player.y = player.lastSafeY;
  player.vx = 0;
  player.vy = 0;
  player.state = 'FALL';
  player.stateTimer = 0;
}

export function damagePlayer(world: WorldState, amount: number, knockbackX: number, reason: 'hazard' | 'enemy'): boolean {
  const { player, cheats } = world;
  if (cheats.godMode || player.invulnTimer > 0) {
    if (player.invulnTimer > 0 && player.evadeTextCooldown <= 0 && reason === 'enemy') {
      spawnFloatingText(world, player.x + player.w * 0.5, player.y - 12, 'EVADE!', '#38bdf8', 1.05);
      player.evadeTextCooldown = 0.45;
    }
    return false;
  }

  player.hp = Math.max(0, player.hp - amount);
  player.invulnTimer = 0.85;
  player.hurtFlashTimer = 0.22;
  player.vx = knockbackX;
  player.vy = -260;
  player.state = 'HURT';
  player.stateTimer = 0;
  player.activeAttackKind = null;

  world.events.push('hurt');
  addCameraShake(world.camera, 9, 0.22, Math.sign(knockbackX) || 0, 1);
  spawnParticles(world, player.x + player.w * 0.5, player.y + player.h * 0.5, 10, '#f43f5e', 90, 240);
  spawnFloatingText(world, player.x + player.w * 0.5, player.y - 10, `-${amount} HP`, '#fb7185', 1.05);

  if (player.hp <= 0) {
    // Respawn safely at active zone checkpoint with restored HP for seamless playtesting
    const zone = world.zones.find((z) => z.id === world.activeZoneId) ?? world.zones[0];
    player.hp = player.maxHp;
    player.x = zone.spawnX;
    player.y = zone.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.state = 'IDLE';
    player.invulnTimer = 1.1;
    spawnFloatingText(world, player.x + player.w * 0.5, player.y - 24, 'RESPAWNED', '#38bdf8', 1.1);
  } else if (reason === 'hazard') {
    pushOutOfPit(world);
  }

  return true;
}

export function applyDamageToEnemy(
  world: WorldState,
  enemy: Enemy,
  damage: number,
  staggerDamage: number,
  knockbackX: number,
  knockbackY: number,
  armorBreak: boolean,
  sourceX: number,
  isCrit = false,
): 'hit' | 'blocked' {
  if (!enemy.alive) return 'blocked';

  // Resonance Crystal refills Dragon Gauge on hit
  if (enemy.kind === 'crystal') {
    enemy.hitFlashTimer = 0.16;
    world.player.dragonGauge = world.tuning.gaugeMax;
    const c = rectCenter(enemy);
    spawnParticles(world, c.x, c.y, 16, '#f43f5e', 90, 260, 140, 4.5);
    spawnFloatingText(world, c.x, enemy.y - 12, 'DRAGON GAUGE MAX!', '#fb7185', 1.15);
    world.events.push('heal');
    return 'hit';
  }

  // Bounce Lantern rings and floats cleanly
  if (enemy.kind === 'lantern') {
    enemy.hitFlashTimer = 0.18;
    const c = rectCenter(enemy);
    spawnParticles(world, c.x, c.y, 10, '#38bdf8', 70, 190, 80, 3.5);
    return 'hit';
  }

  // Front shield check: blocks frontal normal thrusts
  if (enemy.frontShield && !armorBreak) {
    const attackFromFront =
      (enemy.facing === 1 && sourceX >= enemy.x + enemy.w * 0.25) ||
      (enemy.facing === -1 && sourceX <= enemy.x + enemy.w * 0.75);
    if (attackFromFront) {
      enemy.hitFlashTimer = 0.08;
      const c = rectCenter(enemy);
      spawnParticles(world, c.x + enemy.facing * 12, c.y, 8, '#93c5fd', 100, 220);
      spawnFloatingText(world, c.x, enemy.y - 12, 'BLOCKED!', '#93c5fd', 0.95);
      world.events.push('shield_clang');
      return 'blocked';
    }
  }

  const finalDamage =
    enemy.aiState === 'STAGGERED' ? Math.round(damage * 1.5) : Math.round(damage);

  enemy.hp = Math.max(0, enemy.hp - finalDamage);
  enemy.hitFlashTimer = 0.12;

  if (enemy.kind !== 'dummy' && enemy.kind !== 'turret') {
    if (enemy.kind !== 'iron_wyvern_boss') {
      enemy.vx = knockbackX * 0.65;
      if (enemy.kind === 'wyvern') {
        enemy.vy = knockbackY * 0.4;
      }
    }
  }

  // Stagger buildup for boss (and shield break visual for Shield Knight)
  if (enemy.maxStagger > 0 && enemy.aiState !== 'STAGGERED') {
    enemy.stagger += staggerDamage;
    if (enemy.stagger >= enemy.maxStagger) {
      enemy.stagger = enemy.maxStagger;
      enemy.aiState = 'STAGGERED';
      enemy.staggeredTimer = 3.4;
      enemy.vx = 0;
      const c = rectCenter(enemy);
      spawnFloatingText(world, c.x, enemy.y - 26, 'STAGGERED!', '#fbbf24', 1.3);
      spawnParticles(world, c.x, c.y, 20, '#fbbf24', 120, 340);
      addCameraShake(world.camera, 10, 0.25, 0, 1);
    }
  }

  const center = rectCenter(enemy);
  const label = armorBreak && enemy.frontShield ? `BREAK ${finalDamage}!` : `${finalDamage}`;
  const textColor =
    isCrit || enemy.aiState === 'STAGGERED'
      ? '#fbbf24'
      : armorBreak
        ? '#f43f5e'
        : '#f8fafc';
  spawnFloatingText(world, center.x, enemy.y - 10, label, textColor, isCrit ? 1.2 : 1.0);
  spawnParticles(world, center.x, center.y, 9, armorBreak ? '#fb7185' : '#38bdf8', 80, 220);
  world.events.push('hit');

  if (enemy.hp <= 0) {
    if (enemy.kind === 'dummy') {
      // Dummies stay targetable after brief reset
      enemy.alive = false;
      enemy.respawnTimer = 2.5;
      spawnFloatingText(world, center.x, enemy.y - 22, 'KO (RESETTING)', '#94a3b8', 0.9);
    } else {
      enemy.alive = false;
      enemy.aiState = 'DEAD';
      spawnParticles(world, center.x, center.y, 22, '#38bdf8', 110, 320);
      if (enemy.kind === 'iron_wyvern_boss') {
        spawnFloatingText(
          world,
          center.x,
          enemy.y - 34,
          'IRON WYVERN VANQUISHED! [R] Rematch',
          '#fbbf24',
          1.35,
        );
        addCameraShake(world.camera, 16, 0.45, 0, 1);
      }
    }
  }

  return 'hit';
}

export function triggerDiveShockwave(
  world: WorldState,
  x: number,
  y: number,
  radius: number,
  damage: number,
  staggerDamage: number,
  isStardiver: boolean,
  alreadyHitIds: Set<string>,
): void {
  world.shockwaves.push({
    id: nextId(world, 'wave'),
    x,
    y,
    radius: 14,
    maxRadius: radius,
    alpha: 1,
    color: isStardiver ? '#f43f5e' : '#38bdf8',
    isStardiver,
  });

  spawnParticles(
    world,
    x,
    y,
    isStardiver ? 34 : 18,
    isStardiver ? '#f43f5e' : '#38bdf8',
    120,
    isStardiver ? 460 : 290,
    360,
    isStardiver ? 6 : 4.5,
  );

  addCameraShake(
    world.camera,
    isStardiver ? 16 : 9,
    isStardiver ? 0.34 : 0.2,
    0,
    1,
  );

  world.events.push(isStardiver ? 'stardiver' : 'hj_impact');

  for (const enemy of world.enemies) {
    if (!enemy.alive || alreadyHitIds.has(enemy.id)) continue;
    if (enemy.kind === 'lantern') continue;
    const ec = rectCenter(enemy);
    const d = dist({ x, y }, ec);
    if (d <= radius + Math.max(enemy.w, enemy.h) * 0.4) {
      alreadyHitIds.add(enemy.id);
      const kbX = Math.sign(ec.x - x || world.player.facing) * (isStardiver ? 240 : 140);
      applyDamageToEnemy(
        world,
        enemy,
        damage,
        staggerDamage,
        kbX,
        -120,
        true,
        x,
        isStardiver,
      );
    }
  }
}

export function resolveCombat(world: WorldState, dt: number, inputX: -1 | 0 | 1): void {
  const { player, tuning } = world;
  const playerCenter = rectCenter(player);
  const hitbox = getActiveLanceHitbox(player, tuning);

  // 1. Active melee/dive hitbox vs enemies & spikes (for Pogo)
  if (hitbox) {
    if (hitbox.isPogo) {
      // Pogo off spikes safely!
      for (const tile of world.tiles) {
        if (tile.kind !== 'spike' || tile.broken) continue;
        if (rectOverlap(hitbox.rect, tile)) {
          player.vy = tuning.pogoBounceVelocity;
          player.state = 'JUMP';
          player.stateTimer = 0;
          player.canCutJump = false;
          player.activeAttackKind = null;
          player.airHighJumpAvailable = true;
          player.airElusiveAvailable = true;
          world.hitstopTimer = tuning.pogoHitstop * tuning.hitstopScale;
          world.events.push('pogo');
          spawnParticles(world, playerCenter.x, tile.y, 8, '#38bdf8', 70, 180);
          break;
        }
      }
    }

    for (const enemy of world.enemies) {
      if (!enemy.alive || player.attackHitIds.includes(enemy.id)) continue;
      if (!rectOverlap(hitbox.rect, enemy)) continue;

      player.attackHitIds.push(enemy.id);

      let dmg = hitbox.damage;
      let isCrit = hitbox.kind === 'stardiver_dive';
      if (hitbox.kind === 'hj_dive') {
        const dropHeight = Math.max(0, player.y - player.hjApexStartY);
        const mult = 1 + Math.min(1, dropHeight / 280) * (tuning.hjMaxHeightBonusMult - 1);
        dmg = Math.round(hitbox.damage * mult);
        isCrit = dropHeight > 140;
      }

      const outcome = applyDamageToEnemy(
        world,
        enemy,
        dmg,
        hitbox.staggerDamage,
        hitbox.knockbackX,
        hitbox.knockbackY,
        hitbox.armorBreak,
        playerCenter.x,
        isCrit,
      );

      if (outcome === 'blocked') {
        if (!hitbox.isPogo) {
          player.vx = -player.facing * 180;
        } else {
          // Pogo bounces cleanly even off shielded tops
          player.vy = tuning.pogoBounceVelocity;
          player.state = 'JUMP';
          player.canCutJump = false;
          player.activeAttackKind = null;
          player.airHighJumpAvailable = true;
          player.airElusiveAvailable = true;
          world.events.push('pogo');
        }
        continue;
      }

      if (hitbox.isPogo) {
        player.vy = tuning.pogoBounceVelocity;
        player.state = 'JUMP';
        player.stateTimer = 0;
        player.canCutJump = false;
        player.activeAttackKind = null;
        player.airHighJumpAvailable = true;
        player.airElusiveAvailable = true;
        if (enemy.kind !== 'lantern' && enemy.kind !== 'crystal') {
          addDragonGauge(world, 12);
        }
        world.hitstopTimer = tuning.pogoHitstop * tuning.hitstopScale;
        world.events.push('pogo');
        break;
      }

      if (hitbox.kind === 'hj_dive') {
        const ec = rectCenter(enemy);
        const hitSet = new Set<string>([enemy.id]);
        triggerDiveShockwave(
          world,
          ec.x,
          ec.y,
          tuning.hjShockwaveRadius,
          tuning.hjShockwaveDamage,
          18,
          false,
          hitSet,
        );
        addDragonGauge(world, 30);
        player.elusiveCooldown = 0;
        player.hjCooldown = tuning.hjCooldown;
        player.airElusiveAvailable = true;
        player.airHighJumpAvailable = false;
        player.vy = tuning.hjReboundVy;
        player.vx = inputX * 230;
        player.state = 'JUMP';
        player.stateTimer = 0;
        player.canCutJump = false;
        player.invulnTimer = Math.max(player.invulnTimer, 0.16);
        world.hitstopTimer = tuning.hjDiveHitstop * tuning.hitstopScale;
        break;
      }

      if (hitbox.kind === 'stardiver_dive') {
        const ec = rectCenter(enemy);
        const hitSet = new Set<string>([enemy.id]);
        triggerDiveShockwave(
          world,
          ec.x,
          ec.y,
          tuning.stardiverRadius,
          tuning.stardiverDamage * 0.6,
          45,
          true,
          hitSet,
        );
        player.vy = -380;
        player.vx = inputX * 180;
        player.state = 'JUMP';
        player.stateTimer = 0;
        player.canCutJump = false;
        player.invulnTimer = Math.max(player.invulnTimer, 0.25);
        world.hitstopTimer = tuning.stardiverHitstop * tuning.hitstopScale;
        break;
      }

      // Ground / aerial standard thrusts grant gauge
      if (enemy.kind !== 'lantern' && enemy.kind !== 'crystal') {
        addDragonGauge(world, hitbox.kind === 'vorpal_thrust' ? 12 : 8);
      }
      world.hitstopTimer = Math.max(world.hitstopTimer, tuning.thrustHitstop * tuning.hitstopScale);
    }
  }

  // 2. Projectiles update & collisions
  const remainingProjectiles: Projectile[] = [];
  for (const proj of world.projectiles) {
    proj.life += dt;
    const stepDx = proj.vx * dt;
    const stepDy = proj.vy * dt;
    proj.x += stepDx;
    proj.y += stepDy;
    proj.rangeTraveled += Math.hypot(stepDx, stepDy);

    if (proj.life >= proj.maxLife || proj.rangeTraveled >= proj.maxRange) {
      continue;
    }

    const pc = rectCenter(proj);
    if (!proj.pierceWalls && isPointInsideSolidTile(pc.x, pc.y, world.tiles)) {
      spawnParticles(world, pc.x, pc.y, 6, proj.owner === 'player' ? '#38bdf8' : '#fb923c', 60, 160);
      continue;
    }

    if (proj.owner === 'player') {
      let consumed = false;
      for (const enemy of world.enemies) {
        if (!enemy.alive || proj.hitIds.includes(enemy.id)) continue;
        if (!rectOverlap(proj, enemy)) continue;
        proj.hitIds.push(enemy.id);

        const armorBreak = proj.kind === 'geirskogul';
        applyDamageToEnemy(
          world,
          enemy,
          proj.damage,
          armorBreak ? 28 : 12,
          Math.sign(proj.vx) * 140,
          -40,
          armorBreak,
          pc.x,
          proj.kind === 'geirskogul',
        );

        if (proj.kind === 'lancet' && enemy.kind !== 'lantern') {
          world.drainOrbs.push({
            id: nextId(world, 'orb'),
            x: pc.x,
            y: pc.y,
            vx: -Math.sign(proj.vx) * 90,
            vy: -140,
            healAmount: tuning.lancetHeal,
            gaugeGain: tuning.lancetGaugeGain,
            life: 0,
          });
        }

        if (!proj.pierceEnemies) {
          consumed = true;
          break;
        }
      }
      if (consumed) continue;
    } else {
      // Enemy projectile vs player
      const playerHurt: Rect = {
        x: player.x + 4,
        y: player.y + 4,
        w: player.w - 8,
        h: player.h - 6,
      };
      if (rectOverlap(proj, playerHurt)) {
        const hit = damagePlayer(world, 1, Math.sign(proj.vx || 1) * 210, 'enemy');
        if (hit) {
          continue;
        }
      }
    }

    remainingProjectiles.push(proj);
  }
  world.projectiles = remainingProjectiles;

  // 3. Homing Lancet Drain Orbs
  const remainingOrbs = [];
  for (const orb of world.drainOrbs) {
    orb.life += dt;
    const dx = playerCenter.x - orb.x;
    const dy = playerCenter.y - orb.y;
    const d = Math.hypot(dx, dy);

    if (d < 22 || orb.life > 2.2) {
      const prevHp = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + orb.healAmount);
      addDragonGauge(world, orb.gaugeGain);
      const healed = player.hp - prevHp;
      const msg =
        healed > 0
          ? `+${healed} HP  +${orb.gaugeGain} GAUGE`
          : `+${orb.gaugeGain} GAUGE`;
      spawnFloatingText(world, playerCenter.x, player.y - 16, msg, '#34d399', 1.0);
      spawnParticles(world, playerCenter.x, playerCenter.y, 10, '#34d399', 60, 180, 120);
      world.events.push('heal');
      continue;
    }

    const speed = 560 + orb.life * 320;
    const desiredVx = (dx / d) * speed;
    const desiredVy = (dy / d) * speed;
    const steer = Math.min(1, dt * 11);
    orb.vx += (desiredVx - orb.vx) * steer;
    orb.vy += (desiredVy - orb.vy) * steer;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    remainingOrbs.push(orb);
  }
  world.drainOrbs = remainingOrbs;

  // 4. Enemy contact damage (skip during dives & invuln)
  const isDiving = player.state === 'HJ_DIVE' || player.state === 'STARDIVER_DIVE';
  if (!isDiving) {
    const playerHurt: Rect = {
      x: player.x + 4,
      y: player.y + 4,
      w: player.w - 8,
      h: player.h - 6,
    };
    for (const enemy of world.enemies) {
      if (!enemy.alive || enemy.contactDamage <= 0 || enemy.aiState === 'STAGGERED') continue;
      if (rectOverlap(playerHurt, enemy)) {
        const ec = rectCenter(enemy);
        const kbDir = playerCenter.x < ec.x ? -1 : 1;
        damagePlayer(world, enemy.contactDamage, kbDir * 240, 'enemy');
        break;
      }
    }
  }
}
