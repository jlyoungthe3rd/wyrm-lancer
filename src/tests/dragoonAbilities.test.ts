import { describe, expect, it } from 'vitest';
import { emptyInput } from '../engine/input';
import { findHighJumpLockTarget } from '../game/dragoonAbilities';
import { createWorld, stepWorld, warpToZone } from '../game/world';

const DT = 1 / 60;

describe('Dragoon Core Abilities', () => {
  it('executes full 3-phase High Jump (Startup -> Ascent -> Apex -> Dive -> Recovery) with i-frames and height gain', () => {
    const world = createWorld();
    // Use empty flat floor in Zone 2 entry (x = 1200) so dive hits solid ground cleanly
    warpToZone(world, 2);
    for (let i = 0; i < 4; i++) stepWorld(world, emptyInput(), DT);
    const startY = world.player.y;

    stepWorld(world, emptyInput({ highJumpPressed: true, highJumpHeld: true }), DT);
    expect(world.player.state).toBe('HJ_STARTUP');
    expect(world.player.invulnTimer).toBeGreaterThan(0.2);

    // Advance past startup (50ms) into Ascent
    for (let i = 0; i < 4; i++) {
      stepWorld(world, emptyInput({ highJumpHeld: true }), DT);
    }
    expect(world.player.state).toBe('HJ_ASCENT');

    // Advance through ascent (~230ms) into Apex
    for (let i = 0; i < 14; i++) {
      stepWorld(world, emptyInput({ highJumpHeld: true }), DT);
    }
    expect(world.player.state).toBe('HJ_APEX');
    expect(startY - world.player.y).toBeGreaterThan(180);
    expect(world.player.invulnTimer).toBeGreaterThan(0);

    // Release High Jump to trigger Meteor Dive
    stepWorld(world, emptyInput({ highJumpReleased: true }), DT);
    expect(world.player.state).toBe('HJ_DIVE');
    expect(world.player.vy).toBeGreaterThan(800);

    // Dive into solid floor -> HJ_RECOVERY
    for (let i = 0; i < 30; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.player.state === 'HJ_RECOVERY') break;
    }
    expect(world.player.state).toBe('HJ_RECOVERY');
  });

  it('supports High Jump soft target lock-on and directional break-lock', () => {
    const world = createWorld();
    warpToZone(world, 2);
    // Position player above the Shield Knight in Zone 2 (knight is at x: 2070, y: 988)
    world.player.x = 2010;
    world.player.y = 700;
    world.player.state = 'HJ_APEX';

    const lock = findHighJumpLockTarget(world.player, world.enemies, world.tuning, 0);
    expect(lock).not.toBeNull();
    expect(lock?.kind).toBe('shield_knight');

    // Pressing strongly LEFT (opposite target on the right) breaks soft lock-on
    const brokenLock = findHighJumpLockTarget(world.player, world.enemies, world.tuning, -1);
    expect(brokenLock?.id).not.toBe(lock?.id);
  });

  it('shatters Zone 2 Cracked Stone Floor on High Jump Dive', () => {
    const world = createWorld();
    warpToZone(world, 2);
    // Position directly above cracked floor (x: 1760..1940, y: 1040)
    world.player.x = 1835;
    world.player.y = 820;
    world.player.state = 'HJ_DIVE';
    world.player.hjDiveDir = { x: 0, y: 1 };

    for (let i = 0; i < 35; i++) {
      stepWorld(world, emptyInput(), DT);
    }

    const cracked = world.tiles.filter((t) => t.kind === 'cracked');
    expect(cracked.every((t) => t.broken === true)).toBe(true);
    // Player continued falling past y = 1040 into the lower secret chamber
    expect(world.player.y).toBeGreaterThan(1060);
  });

  it('bounces upward on Lance Pogo against Bounce Lantern and refreshes air High Jump & Elusive charges', () => {
    const world = createWorld();
    // Place above first Bounce Lantern in Zone 1 (x: 590, y: 945)
    world.player.x = 590;
    world.player.y = 875;
    world.player.vy = 180;
    world.player.grounded = false;
    world.player.airHighJumpAvailable = false;
    world.player.airElusiveAvailable = false;

    // Trigger Down + Lance (POGO)
    stepWorld(world, emptyInput({ moveY: 1, lancePressed: true }), DT);
    expect(world.player.state).toBe('POGO');

    // Step through startup into active frames hitting the lantern
    for (let i = 0; i < 8; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.events.includes('pogo')) break;
    }

    expect(world.player.vy).toBeLessThan(-350);
    expect(world.player.airHighJumpAvailable).toBe(true);
    expect(world.player.airElusiveAvailable).toBe(true);
  });

  it('performs Reverse-Facing Elusive Jump backflip opposite facing with i-frames and cooldown', () => {
    const world = createWorld();
    for (let i = 0; i < 5; i++) stepWorld(world, emptyInput(), DT);
    // Face left, trigger Elusive Jump -> launches RIGHT!
    world.player.facing = -1;
    const startX = world.player.x;

    stepWorld(world, emptyInput({ elusivePressed: true }), DT);
    expect(world.player.state).toBe('ELUSIVE');
    expect(world.player.vx).toBeGreaterThan(400);
    expect(world.player.vy).toBeLessThan(-200);
    expect(world.player.invulnTimer).toBeGreaterThan(0.1);
    expect(world.player.elusiveCooldown).toBeGreaterThan(1.0);

    for (let i = 0; i < 15; i++) stepWorld(world, emptyInput(), DT);
    expect(world.player.x).toBeGreaterThan(startX + 90);

    // Verify grounded Reverse-Facing Elusive Jump clears Zone 3's wide chasm!
    warpToZone(world, 3);
    world.player.x = 2514;
    world.player.y = 914;
    world.player.facing = -1;
    world.player.elusiveCooldown = 0;
    for (let i = 0; i < 3; i++) stepWorld(world, emptyInput(), DT);
    stepWorld(world, emptyInput({ elusivePressed: true }), DT);
    for (let i = 0; i < 40; i++) stepWorld(world, emptyInput({ moveX: 1 }), DT);
    expect(world.player.grounded).toBe(true);
    expect(world.player.x).toBeGreaterThanOrEqual(2770);
    expect(world.player.y + world.player.h).toBeCloseTo(940, 1);
  });

  it('siphons +1 HP and +15 Dragon Gauge via Lancet drain projectile', () => {
    const world = createWorld();
    for (let i = 0; i < 6; i++) stepWorld(world, emptyInput(), DT);
    world.player.hp = 4;
    world.player.dragonGauge = 10;
    world.player.facing = 1;
    // Zone 1 Dummy 1 is at x: 185, y: 992
    world.player.x = 90;

    stepWorld(world, emptyInput({ lancetPressed: true }), DT);
    expect(world.player.state).toBe('LANCET');

    // Run simulation for ~0.8s so Lancet hits dummy and DrainOrb returns
    for (let i = 0; i < 50; i++) {
      stepWorld(world, emptyInput(), DT);
    }

    expect(world.player.hp).toBe(5);
    expect(world.player.dragonGauge).toBe(25);
  });

  it('enforces Dragon Gauge thresholds for Geirskogul (50) and Stardiver (100)', () => {
    const world = createWorld();
    warpToZone(world, 5);
    for (let i = 0; i < 6; i++) stepWorld(world, emptyInput(), DT);

    // Below 50: cannot fire Dragon Art
    world.player.dragonGauge = 40;
    stepWorld(world, emptyInput({ dragonArtPressed: true }), DT);
    expect(world.player.state).toBe('IDLE');
    expect(world.player.dragonGauge).toBe(40);

    // At 60: fires Geirskogul, spends 50, pierces Zone 5 solid wall (x: 4770) to hit Shield Knight (x: 4845)
    world.player.x = 4680;
    world.player.facing = 1;
    world.player.dragonGauge = 60;
    const knightBefore = world.enemies.find((e) => e.zoneId === 5 && e.kind === 'shield_knight')!;
    const knightHpBefore = knightBefore.hp;

    stepWorld(world, emptyInput({ dragonArtPressed: true }), DT);
    expect(world.player.state).toBe('GEIRSKOGUL');
    expect(world.player.dragonGauge).toBe(10);

    for (let i = 0; i < 20; i++) stepWorld(world, emptyInput(), DT);
    expect(knightBefore.hp).toBeLessThan(knightHpBefore);

    // At 100: fires Stardiver, spends 100, unleashes fiery meteor dive
    world.player.dragonGauge = 100;
    stepWorld(world, emptyInput({ dragonArtPressed: true }), DT);
    expect(world.player.state).toBe('STARDIVER_ASCENT');
    expect(world.player.dragonGauge).toBe(0);

    for (let i = 0; i < 50; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.events.includes('stardiver')) break;
    }
    expect(world.events).toContain('stardiver');
  });
});
