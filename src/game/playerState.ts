import type { InputSnapshot } from '../engine/input';
import { approach, clamp, rectCenter, rectOverlap } from '../engine/math';
import type { SwipeDirection } from '../engine/touchInput';
import { damagePlayer, triggerDiveShockwave } from './combat';
import {
  computeDiveVector,
  findHighJumpLockTarget,
  spawnGeirskogulWave,
  spawnLancetProjectile,
  spawnParticles,
} from './dragoonAbilities';
import { moveAndCollide } from './physics';
import type { Player, TileRect, WorldState } from './types';

function isStandingOnOnlyOneWay(player: Player, tiles: TileRect[]): boolean {
  const feetProbe = {
    x: player.x + 2,
    y: player.y + player.h,
    w: player.w - 4,
    h: 5,
  };
  let onOneWay = false;
  for (const tile of tiles) {
    if (tile.broken) continue;
    if (!rectOverlap(feetProbe, tile)) continue;
    if (tile.kind === 'solid' || tile.kind === 'cracked') return false;
    if (tile.kind === 'oneway') onOneWay = true;
  }
  return onOneWay;
}

function shatterCrackedTiles(world: WorldState, hitIds: string[]): void {
  if (hitIds.length === 0) return;
  const hitSet = new Set(hitIds);
  // Break any contiguous cracked stones adjacent to the hit tiles
  let changed = true;
  while (changed) {
    changed = false;
    for (const tile of world.tiles) {
      if (tile.kind !== 'cracked' || tile.broken || hitSet.has(tile.id)) continue;
      for (const existingId of hitSet) {
        const ref = world.tiles.find((t) => t.id === existingId);
        if (!ref) continue;
        const touchingX = Math.abs(tile.x + tile.w - ref.x) <= 4 || Math.abs(ref.x + ref.w - tile.x) <= 4;
        const sameRow = Math.abs(tile.y - ref.y) <= 8;
        if (touchingX && sameRow) {
          hitSet.add(tile.id);
          changed = true;
          break;
        }
      }
    }
  }

  for (const tile of world.tiles) {
    if (hitSet.has(tile.id) && !tile.broken) {
      tile.broken = true;
      const c = rectCenter(tile);
      spawnParticles(world, c.x, c.y, 12, '#94a3b8', 90, 260, 620, 5);
    }
  }
  world.events.push('crack_shatter');
}

function recordAfterimage(player: Player, color: string): void {
  player.afterimages.push({
    x: player.x,
    y: player.y,
    facing: player.facing,
    state: player.state,
    alpha: 0.55,
    color,
  });
  if (player.afterimages.length > 10) {
    player.afterimages.shift();
  }
}

function updateScarfAndAfterimages(player: Player, dt: number): void {
  for (let i = player.afterimages.length - 1; i >= 0; i--) {
    player.afterimages[i].alpha -= dt * 3.2;
    if (player.afterimages[i].alpha <= 0) {
      player.afterimages.splice(i, 1);
    }
  }

  const anchorX = player.x + player.w * 0.5 - player.facing * 5;
  const anchorY = player.y + 14;
  if (player.scarfNodes.length === 0) {
    for (let i = 0; i < 6; i++) {
      player.scarfNodes.push({ x: anchorX - player.facing * i * 6, y: anchorY });
    }
    return;
  }

  player.scarfNodes[0].x = anchorX;
  player.scarfNodes[0].y = anchorY;
  const segLen = 7;
  for (let i = 1; i < player.scarfNodes.length; i++) {
    const prev = player.scarfNodes[i - 1];
    const curr = player.scarfNodes[i];
    // Slight backward flutter + gravity sag
    curr.x -= player.facing * 18 * dt;
    curr.y += (32 + Math.sin(i * 1.4) * 14) * dt;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d > segLen && d > 0.001) {
      curr.x = prev.x + (dx / d) * segLen;
      curr.y = prev.y + (dy / d) * segLen;
    }
  }
}

function tryStartLance(player: Player, input: InputSnapshot): boolean {
  if (!input.lancePressed) return false;
  player.attackHitIds = [];
  player.stateTimer = 0;

  if (!player.grounded && input.moveY > 0) {
    player.state = 'POGO';
    player.activeAttackKind = 'pogo';
    return true;
  }

  player.state = 'THRUST';
  if (input.moveY < 0) {
    player.activeAttackKind = 'up_thrust';
    return true;
  }

  if (player.grounded && player.comboWindowTimer > 0 && player.comboStep === 1) {
    player.activeAttackKind = 'vorpal_thrust';
    player.comboStep = 0;
    player.comboWindowTimer = 0;
    player.vx = player.facing * 195;
  } else {
    player.activeAttackKind = 'true_thrust';
    player.comboStep = 1;
    player.comboWindowTimer = 0;
  }
  return true;
}

function tryStartHighJump(world: WorldState, input: InputSnapshot): boolean {
  const { player, tuning } = world;
  if (!input.highJumpPressed) return false;
  if (player.hjCooldown > 0) return false;
  if (!player.grounded && !player.airHighJumpAvailable) return false;

  if (!player.grounded) {
    player.airHighJumpAvailable = false;
  }
  player.state = 'HJ_STARTUP';
  player.stateTimer = 0;
  player.activeAttackKind = null;
  player.attackHitIds = [];
  player.hjStartY = player.y;
  player.hjLockTargetId = null;
  player.hjManualOverride = false;
  player.hjDiveTriggeredSound = false;
  player.vx *= 0.45;
  player.vy = 0;
  player.grounded = false;
  player.invulnTimer = Math.max(
    player.invulnTimer,
    tuning.hjStartup + tuning.hjAscentDuration + tuning.hjApexInvulnDuration,
  );
  return true;
}

function tryStartElusiveJump(world: WorldState, input: InputSnapshot): boolean {
  const { player, tuning } = world;
  if (!input.elusivePressed) return false;
  if (player.elusiveCooldown > 0) return false;
  if (!player.grounded && !player.airElusiveAvailable) return false;

  if (!player.grounded) {
    player.airElusiveAvailable = false;
  }
  player.state = 'ELUSIVE';
  player.stateTimer = 0;
  player.activeAttackKind = null;
  player.canCutJump = false;
  player.grounded = false;
  player.vx = -player.facing * tuning.elusiveVx;
  player.vy = tuning.elusiveVy;
  player.invulnTimer = Math.max(player.invulnTimer, tuning.elusiveInvulnDuration);
  player.elusiveCooldown = tuning.elusiveCooldown;
  world.events.push('elusive');
  spawnParticles(world, player.x + player.w * 0.5, player.y + player.h * 0.5, 10, '#38bdf8', 70, 190);
  return true;
}

function tryStartLancet(world: WorldState, input: InputSnapshot): boolean {
  const { player } = world;
  if (!input.lancetPressed || player.lancetCooldown > 0) return false;

  player.state = 'LANCET';
  player.stateTimer = 0;
  player.lancetSpawned = false;
  player.activeAttackKind = null;
  if (!player.grounded) {
    player.vy = Math.min(player.vy, 0) * 0.25;
  } else {
    player.vx *= 0.3;
  }
  return true;
}

function tryStartDragonArt(world: WorldState, input: InputSnapshot): boolean {
  const { player, tuning } = world;
  if (!input.dragonArtPressed) return false;

  if (player.dragonGauge >= tuning.stardiverCost) {
    player.dragonGauge -= tuning.stardiverCost;
    player.state = 'STARDIVER_ASCENT';
    player.stateTimer = 0;
    player.activeAttackKind = null;
    player.attackHitIds = [];
    player.grounded = false;
    player.vy = tuning.stardiverAscentVelocity;
    player.vx *= 0.4;
    player.invulnTimer = Math.max(player.invulnTimer, tuning.stardiverAscentDuration + 0.3);
    world.events.push('hj_launch');
    spawnParticles(world, player.x + player.w * 0.5, player.y + player.h, 16, '#f43f5e', 90, 260);
    return true;
  }

  if (player.dragonGauge >= tuning.geirskogulCost) {
    player.dragonGauge -= tuning.geirskogulCost;
    player.state = 'GEIRSKOGUL';
    player.stateTimer = 0;
    player.geirskogulSpawned = false;
    player.activeAttackKind = null;
    player.vx *= 0.2;
    if (!player.grounded) {
      player.vy = 0;
    }
    return true;
  }

  return false;
}

function executeTouchGroundedSwipe(world: WorldState, dir: SwipeDirection): void {
  const { player, tuning } = world;
  if (dir === 'down') {
    if (isStandingOnOnlyOneWay(player, world.tiles)) {
      player.dropThroughTimer = 0.22;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.state = 'FALL';
      player.stateTimer = 0;
      player.airHopCharges = tuning.touchMaxAirHopCharges;
      player.apexFloatTimer = 0;
      player.touchFastFalling = false;
    }
    return;
  }

  player.grounded = false;
  player.coyoteTimer = 0;
  player.canCutJump = false;
  player.dropThroughTimer = 0;
  player.touchFastFalling = false;
  player.state = 'JUMP';
  player.stateTimer = 0;
  player.airHopCharges = tuning.touchMaxAirHopCharges;
  player.apexFloatTimer = tuning.touchApexFloatDuration;

  if (dir === 'up') {
    player.vx *= 0.2;
    player.vy = tuning.touchSingleJumpVy;
  } else {
    player.facing = dir === 'right' ? 1 : -1;
    player.vx = player.facing * tuning.touchHopVx;
    player.vy = tuning.touchHopVy;
  }

  world.events.push('jump');
  spawnParticles(world, player.x + player.w * 0.5, player.y + player.h, 5, '#cbd5e1', 40, 110);
}

function executeTouchAirSwipe(world: WorldState, dir: SwipeDirection): void {
  const { player, tuning } = world;

  if (dir === 'down') {
    // Free fast-fall cancel: never consumes airHopCharges, pure movement tool
    player.touchFastFalling = true;
    player.apexFloatTimer = 0;
    player.vx *= 0.15;
    player.vy = Math.max(player.vy, tuning.touchFastFallVy);
    player.dropThroughTimer = 0.22;
    player.state = 'FALL';
    player.stateTimer = 0;
    player.activeAttackKind = null;
    spawnParticles(world, player.x + player.w * 0.5, player.y + 8, 5, '#818cf8', 40, 110, 260, 3);
    return;
  }

  if (player.airHopCharges <= 0) {
    // Buffer directional hop/jump for instant execution on touchdown
    player.touchSwipeBufferDir = dir;
    player.touchSwipeBufferTimer = tuning.touchSwipeBufferTime;
    return;
  }

  player.airHopCharges -= 1;
  player.touchFastFalling = false;
  player.dropThroughTimer = 0;
  player.canCutJump = false;
  player.state = 'JUMP';
  player.stateTimer = 0;
  player.apexFloatTimer =
    player.airHopCharges > 0 ? tuning.touchApexFloatDuration : tuning.touchApexFloatDuration * 0.35;

  if (dir === 'up') {
    player.vx *= 0.25;
    player.vy = tuning.touchDoubleJumpVy;
  } else {
    player.facing = dir === 'right' ? 1 : -1;
    player.vx = player.facing * tuning.touchAirHopVx;
    player.vy = tuning.touchAirHopVy;
  }

  world.events.push('jump');
  spawnParticles(world, player.x + player.w * 0.5, player.y + player.h, 7, '#38bdf8', 55, 140, 180, 3.5);
}

function updateTouchPlayer(world: WorldState, input: InputSnapshot, dt: number): void {
  const { player, tuning, cheats } = world;

  player.stateTimer += dt;
  player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
  player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  player.hurtFlashTimer = Math.max(0, player.hurtFlashTimer - dt);
  player.evadeTextCooldown = Math.max(0, player.evadeTextCooldown - dt);
  player.touchSwipeBufferTimer = Math.max(0, player.touchSwipeBufferTimer - dt);
  if (player.touchSwipeBufferTimer <= 0) {
    player.touchSwipeBufferDir = null;
  }
  player.hjCooldown = Math.max(0, player.hjCooldown - dt);
  player.elusiveCooldown = Math.max(0, player.elusiveCooldown - dt);
  player.lancetCooldown = Math.max(0, player.lancetCooldown - dt);
  player.activeAttackKind = null;

  if (cheats.infiniteGauge) {
    player.dragonGauge = tuning.gaugeMax;
  }
  if (cheats.zeroCooldowns) {
    player.airHopCharges = tuning.touchMaxAirHopCharges;
  }

  const wasGrounded = player.grounded;

  if (player.state === 'HURT') {
    player.vx = approach(player.vx, 0, 750 * dt);
    player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
    if (player.stateTimer >= 0.22) {
      player.state = player.grounded ? 'IDLE' : 'FALL';
      player.stateTimer = 0;
    }
  } else {
    if (input.touchSwipe !== null) {
      const useGrounded =
        input.touchSwipe === 'down'
          ? player.grounded
          : player.grounded || player.coyoteTimer > 0;
      if (useGrounded) {
        executeTouchGroundedSwipe(world, input.touchSwipe);
      } else {
        executeTouchAirSwipe(world, input.touchSwipe);
      }
    }

    if (player.grounded) {
      player.vx = approach(player.vx, 0, tuning.groundDecel * 1.15 * dt);
      player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
    } else {
      const inApexFloat =
        !player.touchFastFalling &&
        Math.abs(player.vy) < tuning.touchApexVelocityThreshold &&
        player.apexFloatTimer > 0;

      if (inApexFloat) {
        player.apexFloatTimer = Math.max(0, player.apexFloatTimer - dt);
        player.vy = Math.min(
          tuning.maxFallSpeed,
          player.vy + tuning.gravity * tuning.touchApexFloatGravityMult * dt,
        );
        player.vx = approach(player.vx, 0, 320 * dt);
      } else if (player.touchFastFalling) {
        const maxDrop = Math.max(tuning.maxFallSpeed, tuning.touchFastFallVy);
        player.vy = Math.min(maxDrop, player.vy + tuning.gravity * 1.4 * dt);
        player.vx = approach(player.vx, 0, 900 * dt);
      } else {
        player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
        player.vx = approach(player.vx, 0, 140 * dt);
      }
      player.state = player.vy < 0 ? 'JUMP' : 'FALL';
    }
  }

  const moveRes = moveAndCollide(player, player.vx, player.vy, dt, world.tiles, {
    ignoreOneWay: player.dropThroughTimer > 0,
    allowCrackedBreak: false,
  });

  if (moveRes.hitCeiling && player.vy < 0) {
    player.vy = 0;
  }
  if (moveRes.hitWallLeft || moveRes.hitWallRight) {
    player.vx = 0;
  }

  player.grounded = moveRes.grounded;

  if (player.grounded) {
    player.vy = 0;
    player.coyoteTimer = tuning.coyoteTime;
    player.airHopCharges = tuning.touchMaxAirHopCharges;
    player.apexFloatTimer = 0;
    player.touchFastFalling = false;
    player.canCutJump = false;
    if (!wasGrounded) {
      player.vx *= 0.25;
    }

    if (!moveRes.hitSpike) {
      player.lastSafeX = clamp(player.x, 40, world.levelWidth - 80);
      player.lastSafeY = player.y;
    }

    if (player.state !== 'HURT') {
      if (player.touchSwipeBufferTimer > 0 && player.touchSwipeBufferDir !== null) {
        const bufferedDir = player.touchSwipeBufferDir;
        player.touchSwipeBufferDir = null;
        player.touchSwipeBufferTimer = 0;
        executeTouchGroundedSwipe(world, bufferedDir);
      } else {
        player.state = 'IDLE';
      }
    }
  }

  player.x = clamp(player.x, 20, world.levelWidth - player.w - 20);

  if (moveRes.hitSpike) {
    damagePlayer(world, 1, -player.facing * 180, 'hazard');
  } else if (player.y > world.levelHeight + 100) {
    damagePlayer(world, 1, 0, 'hazard');
  }

  updateScarfAndAfterimages(player, dt);
}

export function updatePlayer(world: WorldState, input: InputSnapshot, dt: number): void {
  if (world.controlScheme === 'touch') {
    updateTouchPlayer(world, input, dt);
    return;
  }

  const { player, tuning, cheats } = world;

  // Tick timers
  player.stateTimer += dt;
  player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
  player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  player.hurtFlashTimer = Math.max(0, player.hurtFlashTimer - dt);
  player.evadeTextCooldown = Math.max(0, player.evadeTextCooldown - dt);
  player.comboWindowTimer = Math.max(0, player.comboWindowTimer - dt);
  player.hjCooldown = Math.max(0, player.hjCooldown - dt);
  player.elusiveCooldown = Math.max(0, player.elusiveCooldown - dt);
  player.lancetCooldown = Math.max(0, player.lancetCooldown - dt);

  if (cheats.infiniteGauge) {
    player.dragonGauge = tuning.gaugeMax;
  }
  if (cheats.zeroCooldowns) {
    player.hjCooldown = 0;
    player.elusiveCooldown = 0;
    player.lancetCooldown = 0;
    player.airHighJumpAvailable = true;
    player.airElusiveAvailable = true;
  }

  // Record Jump buffer (unless dropping through one-way platform)
  if (input.jumpPressed) {
    if (player.grounded && input.moveY > 0 && isStandingOnOnlyOneWay(player, world.tiles)) {
      player.dropThroughTimer = 0.22;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.state = 'FALL';
      player.stateTimer = 0;
    } else {
      player.jumpBufferTimer = tuning.jumpBufferTime;
    }
  }

  let ignoreOneWay = player.dropThroughTimer > 0;
  let allowCrackedBreak = false;

  // State Machine Dispatch
  switch (player.state) {
    case 'IDLE':
    case 'RUN':
    case 'JUMP':
    case 'FALL': {
      if (input.moveX !== 0) {
        player.facing = input.moveX;
      }

      const targetVx = input.moveX * tuning.runSpeed;
      const accel = player.grounded
        ? input.moveX !== 0
          ? tuning.groundAccel
          : tuning.groundDecel
        : input.moveX !== 0
          ? tuning.airAccel
          : tuning.airDecel;

      player.vx = approach(player.vx, targetVx, accel * dt);

      // Coyote + Jump Buffer Jump
      if (player.jumpBufferTimer > 0 && (player.grounded || player.coyoteTimer > 0)) {
        player.vy = tuning.jumpVelocity;
        player.grounded = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.canCutJump = true;
        player.state = 'JUMP';
        player.stateTimer = 0;
        world.events.push('jump');
        spawnParticles(world, player.x + player.w * 0.5, player.y + player.h, 5, '#cbd5e1', 40, 110);
      }

      // Variable jump height cut
      if (player.state === 'JUMP' && player.canCutJump && input.jumpReleased && player.vy < 0) {
        player.vy *= tuning.jumpCutMult;
        player.canCutJump = false;
      }

      // Gravity + Hollow Knight apex hang
      const nearApex =
        !player.grounded && Math.abs(player.vy) < tuning.apexVelocityThreshold;
      const grav = tuning.gravity * (nearApex ? tuning.apexGravityMult : 1);
      player.vy = Math.min(tuning.maxFallSpeed, player.vy + grav * dt);

      // Ability transitions (ordered by priority)
      if (tryStartDragonArt(world, input)) break;
      if (tryStartHighJump(world, input)) break;
      if (tryStartElusiveJump(world, input)) break;
      if (tryStartLancet(world, input)) break;
      if (tryStartLance(player, input)) {
        world.events.push('thrust');
        break;
      }

      // Locomotion state sync
      if (player.grounded) {
        player.state = Math.abs(player.vx) > 15 ? 'RUN' : 'IDLE';
      } else {
        player.state = player.vy < 0 ? 'JUMP' : 'FALL';
      }
      break;
    }

    case 'THRUST':
    case 'POGO': {
      const totalDuration =
        tuning.thrustStartup + tuning.thrustActive + tuning.thrustRecovery;
      if (player.grounded) {
        player.vx = approach(player.vx, 0, tuning.groundDecel * 0.7 * dt);
      } else {
        const accel = input.moveX !== 0 ? tuning.airAccel * 0.75 : tuning.airDecel * 0.6;
        player.vx = approach(player.vx, input.moveX * tuning.runSpeed, accel * dt);
        player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
      }

      if (player.stateTimer >= totalDuration) {
        if (player.activeAttackKind === 'true_thrust') {
          player.comboWindowTimer = tuning.comboWindow;
        }
        player.activeAttackKind = null;
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }

    case 'HJ_STARTUP': {
      player.vx = approach(player.vx, 0, tuning.groundDecel * dt);
      player.vy = 0;
      if (player.stateTimer >= tuning.hjStartup) {
        player.state = 'HJ_ASCENT';
        player.stateTimer = 0;
        player.vy = tuning.hjAscentVelocity;
        world.events.push('hj_launch');
        spawnParticles(world, player.x + player.w * 0.5, player.y + player.h, 14, '#38bdf8', 90, 250);
      }
      break;
    }

    case 'HJ_ASCENT': {
      ignoreOneWay = true;
      player.vx = approach(player.vx, input.moveX * tuning.runSpeed * 0.45, tuning.airAccel * dt);
      player.vy = tuning.hjAscentVelocity;
      if (Math.floor(player.stateTimer * 60) % 2 === 0) {
        recordAfterimage(player, '#38bdf8');
      }
      if (player.stateTimer >= tuning.hjAscentDuration) {
        player.state = 'HJ_APEX';
        player.stateTimer = 0;
        player.vy = 0;
        player.vx *= 0.3;
      }
      break;
    }

    case 'HJ_APEX': {
      ignoreOneWay = true;
      if (input.moveX !== 0) {
        player.facing = input.moveX;
      }
      player.vx = approach(player.vx, input.moveX * 110, 800 * dt);
      player.vy = Math.min(60, player.vy + tuning.gravity * tuning.hjApexGravityMult * dt);

      const lockTarget = findHighJumpLockTarget(player, world.enemies, tuning, input.moveX);
      player.hjLockTargetId = lockTarget ? lockTarget.id : null;
      player.hjDiveDir = computeDiveVector(player, input.moveX, lockTarget, tuning);

      // Upgrade directly into Stardiver if 100 Dragon Gauge!
      if (input.dragonArtPressed && player.dragonGauge >= tuning.stardiverCost) {
        player.dragonGauge -= tuning.stardiverCost;
        player.state = 'STARDIVER_DIVE';
        player.stateTimer = 0;
        player.hjApexStartY = player.y;
        player.attackHitIds = [];
        player.vx = player.hjDiveDir.x * tuning.stardiverDiveSpeed;
        player.vy = player.hjDiveDir.y * tuning.stardiverDiveSpeed;
        world.events.push('hj_dive');
        break;
      }

      const tapAutoDive = !input.highJumpHeld && player.stateTimer >= 0.14;
      const manualRelease = input.highJumpReleased && player.stateTimer >= 0.03;
      if (
        manualRelease ||
        input.lancePressed ||
        tapAutoDive ||
        player.stateTimer >= tuning.hjApexDuration
      ) {
        player.state = 'HJ_DIVE';
        player.stateTimer = 0;
        player.hjApexStartY = player.y;
        player.attackHitIds = [];
        player.vx = player.hjDiveDir.x * tuning.hjDiveSpeed;
        player.vy = player.hjDiveDir.y * tuning.hjDiveSpeed;
        world.events.push('hj_dive');
      }
      break;
    }

    case 'HJ_DIVE': {
      ignoreOneWay = true;
      allowCrackedBreak = true;
      player.vx = player.hjDiveDir.x * tuning.hjDiveSpeed;
      player.vy = player.hjDiveDir.y * tuning.hjDiveSpeed;
      if (Math.floor(player.stateTimer * 60) % 2 === 0) {
        recordAfterimage(player, '#7dd3fc');
      }
      break;
    }

    case 'HJ_RECOVERY': {
      player.vx = approach(player.vx, 0, tuning.groundDecel * dt);
      player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
      // High-skill recovery cancel via Elusive Jump!
      if (tryStartElusiveJump(world, input)) break;
      if (player.stateTimer >= tuning.hjRecoveryDuration) {
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }

    case 'ELUSIVE': {
      player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * 0.72 * dt);
      if (Math.floor(player.stateTimer * 60) % 2 === 0) {
        recordAfterimage(player, '#818cf8');
      }
      if (player.stateTimer >= tuning.elusiveDuration) {
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }

    case 'LANCET': {
      if (!player.lancetSpawned && player.stateTimer >= 0.035) {
        player.lancetSpawned = true;
        spawnLancetProjectile(world, input.moveY);
        player.lancetCooldown = tuning.lancetCooldown;
      }
      if (!player.grounded) {
        player.vy = Math.min(80, player.vy + tuning.gravity * 0.25 * dt);
      } else {
        player.vx = approach(player.vx, 0, tuning.groundDecel * dt);
      }
      if (player.stateTimer >= tuning.lancetCastDuration) {
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }

    case 'GEIRSKOGUL': {
      if (!player.geirskogulSpawned && player.stateTimer >= 0.05) {
        player.geirskogulSpawned = true;
        spawnGeirskogulWave(world);
      }
      player.vx = approach(player.vx, 0, tuning.groundDecel * dt);
      if (!player.grounded) {
        player.vy = Math.min(80, player.vy + tuning.gravity * 0.2 * dt);
      }
      if (player.stateTimer >= tuning.geirskogulCastDuration) {
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }

    case 'STARDIVER_ASCENT': {
      ignoreOneWay = true;
      player.vx = approach(player.vx, input.moveX * tuning.runSpeed * 0.5, tuning.airAccel * dt);
      player.vy = tuning.stardiverAscentVelocity;
      if (Math.floor(player.stateTimer * 60) % 2 === 0) {
        recordAfterimage(player, '#f43f5e');
      }
      if (player.stateTimer >= tuning.stardiverAscentDuration) {
        const lockTarget = findHighJumpLockTarget(player, world.enemies, tuning, input.moveX);
        player.hjLockTargetId = lockTarget ? lockTarget.id : null;
        player.hjDiveDir = computeDiveVector(player, input.moveX, lockTarget, tuning);
        player.hjApexStartY = player.y;
        player.state = 'STARDIVER_DIVE';
        player.stateTimer = 0;
        player.vx = player.hjDiveDir.x * tuning.stardiverDiveSpeed;
        player.vy = player.hjDiveDir.y * tuning.stardiverDiveSpeed;
        world.events.push('hj_dive');
      }
      break;
    }

    case 'STARDIVER_DIVE': {
      ignoreOneWay = true;
      allowCrackedBreak = true;
      player.vx = player.hjDiveDir.x * tuning.stardiverDiveSpeed;
      player.vy = player.hjDiveDir.y * tuning.stardiverDiveSpeed;
      if (Math.floor(player.stateTimer * 60) % 2 === 0) {
        recordAfterimage(player, '#fb7185');
      }
      break;
    }

    case 'HURT': {
      player.vx = approach(player.vx, 0, 750 * dt);
      player.vy = Math.min(tuning.maxFallSpeed, player.vy + tuning.gravity * dt);
      if (player.stateTimer >= 0.22) {
        player.state = player.grounded ? 'IDLE' : 'FALL';
        player.stateTimer = 0;
      }
      break;
    }
  }

  // Apply Physics Collision
  const moveRes = moveAndCollide(player, player.vx, player.vy, dt, world.tiles, {
    ignoreOneWay,
    allowCrackedBreak,
  });

  if (moveRes.hitCrackedIds.length > 0) {
    shatterCrackedTiles(world, moveRes.hitCrackedIds);
  }

  if (moveRes.hitCeiling && player.vy < 0) {
    player.vy = 0;
    if (player.state === 'HJ_ASCENT') {
      player.state = 'HJ_APEX';
      player.stateTimer = 0;
    } else if (player.state === 'STARDIVER_ASCENT') {
      const lockTarget = findHighJumpLockTarget(player, world.enemies, tuning, input.moveX);
      player.hjDiveDir = computeDiveVector(player, input.moveX, lockTarget, tuning);
      player.hjApexStartY = player.y;
      player.state = 'STARDIVER_DIVE';
      player.stateTimer = 0;
    }
  }

  if (moveRes.hitWallLeft || moveRes.hitWallRight) {
    if (player.state === 'HJ_DIVE' || player.state === 'STARDIVER_DIVE') {
      player.vx = 0;
      player.hjDiveDir = { x: 0, y: 1 };
    } else {
      player.vx = 0;
    }
  }

  player.grounded = moveRes.grounded;

  if (player.grounded) {
    player.vy = 0;
    player.coyoteTimer = tuning.coyoteTime;
    player.airHighJumpAvailable = true;
    player.airElusiveAvailable = true;
    player.canCutJump = false;

    if (!moveRes.hitSpike) {
      // Save safe solid/oneway respawn position slightly inset
      player.lastSafeX = clamp(player.x, 40, world.levelWidth - 80);
      player.lastSafeY = player.y;
    }

    if (player.state === 'JUMP' || player.state === 'FALL') {
      player.state = Math.abs(player.vx) > 15 ? 'RUN' : 'IDLE';
      player.stateTimer = 0;
    }
  }

  // Clamp within horizontal level bounds
  player.x = clamp(player.x, 20, world.levelWidth - player.w - 20);

  // Spike & Abyss Checks (skip spike damage if actively POGOing above it; combat handles spike pogo)
  if (moveRes.hitSpike && player.state !== 'POGO') {
    damagePlayer(world, 1, -player.facing * 180, 'hazard');
  } else if (player.y > world.levelHeight + 100) {
    damagePlayer(world, 1, 0, 'hazard');
  }

  updateScarfAndAfterimages(player, dt);
}

/**
 * Runs after resolveCombat so a High Jump / Stardiver dive landing directly on a
 * floor-level enemy awards the Direct Hit + Rebound rather than a ground miss.
 */
export function finalizeDiveGroundImpact(world: WorldState): void {
  const { player, tuning } = world;
  if (!player.grounded) return;

  if (player.state === 'HJ_DIVE') {
    const hitSet = new Set<string>(player.attackHitIds);
    triggerDiveShockwave(
      world,
      player.x + player.w * 0.5,
      player.y + player.h,
      tuning.hjShockwaveRadius,
      tuning.hjShockwaveDamage,
      16,
      false,
      hitSet,
    );
    player.hjCooldown = tuning.hjCooldown;
    player.state = 'HJ_RECOVERY';
    player.stateTimer = 0;
    player.vx = 0;
  } else if (player.state === 'STARDIVER_DIVE') {
    const hitSet = new Set<string>(player.attackHitIds);
    triggerDiveShockwave(
      world,
      player.x + player.w * 0.5,
      player.y + player.h,
      tuning.stardiverRadius,
      tuning.stardiverDamage,
      55,
      true,
      hitSet,
    );
    player.state = 'HJ_RECOVERY';
    player.stateTimer = 0;
    player.vx = 0;
  }
}
