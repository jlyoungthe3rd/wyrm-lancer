import { describe, expect, it } from 'vitest';
import { emptyInput } from '../engine/input';
import { classifyCardinalSwipe } from '../engine/touchInput';
import { createWorld, stepWorld } from '../game/world';

const DT = 1 / 60;

function createTouchWorld() {
  const world = createWorld();
  world.controlScheme = 'touch';
  for (let i = 0; i < 4; i++) {
    stepWorld(world, emptyInput(), DT);
  }
  return world;
}

describe('Touch Hop-Swipe Controls & Locomotion', () => {
  it('classifies drags strictly into 4 cardinal directions once past threshold', () => {
    expect(classifyCardinalSwipe(12, 10, 26)).toBeNull();
    expect(classifyCardinalSwipe(28, 25, 26)).toBe('right');
    expect(classifyCardinalSwipe(-30, 12, 26)).toBe('left');
    expect(classifyCardinalSwipe(14, -29, 26)).toBe('up');
    expect(classifyCardinalSwipe(-10, 32, 26)).toBe('down');
  });

  it('performs grounded Skip-Hops Left & Right without spending airHopCharges and lands crisply', () => {
    const world = createTouchWorld();
    const startX = world.player.x;

    // Swipe Right -> Skip-Hop Right
    stepWorld(world, emptyInput({ touchSwipe: 'right' }), DT);
    expect(world.player.facing).toBe(1);
    expect(world.player.vx).toBeGreaterThan(250);
    expect(world.player.vy).toBeLessThan(-320);
    expect(world.player.grounded).toBe(false);
    expect(world.player.airHopCharges).toBe(1);

    // Let hop land cleanly
    for (let i = 0; i < 45; i++) {
      stepWorld(world, emptyInput(), DT);
    }
    expect(world.player.grounded).toBe(true);
    expect(world.player.x).toBeGreaterThan(startX + 80);
    expect(Math.abs(world.player.vx)).toBeLessThan(1);

    // Swipe Left -> Skip-Hop Left
    const midX = world.player.x;
    stepWorld(world, emptyInput({ touchSwipe: 'left' }), DT);
    expect(world.player.facing).toBe(-1);
    expect(world.player.vx).toBeLessThan(-250);
    for (let i = 0; i < 45; i++) {
      stepWorld(world, emptyInput(), DT);
    }
    expect(world.player.grounded).toBe(true);
    expect(world.player.x).toBeLessThan(midX - 80);
  });

  it('supports Single Jump Up and One-Way Drop-Through on Swipe Down (no-op on solid ground)', () => {
    const world = createTouchWorld();
    // Solid ground: Swipe Down does nothing
    stepWorld(world, emptyInput({ touchSwipe: 'down' }), DT);
    expect(world.player.grounded).toBe(true);
    expect(world.player.y + world.player.h).toBeCloseTo(1040, 1);

    // Position above Zone 1 one-way deck (x: 350..495, y: 865)
    world.player.x = 370;
    world.player.y = 819;
    for (let i = 0; i < 4; i++) stepWorld(world, emptyInput(), DT);
    expect(world.player.grounded).toBe(true);
    expect(world.player.y + world.player.h).toBeCloseTo(865, 1);

    // Swipe Down drops through one-way deck without consuming airHopCharges
    stepWorld(world, emptyInput({ touchSwipe: 'down' }), DT);
    for (let i = 0; i < 12; i++) stepWorld(world, emptyInput(), DT);
    expect(world.player.grounded).toBe(false);
    expect(world.player.y + world.player.h).toBeGreaterThan(880);
    expect(world.player.airHopCharges).toBe(1);
  });

  it('grants 1 default Air Hop / Double Jump charge, blocks extra air hops until landing, and refills on touchdown', () => {
    const world = createTouchWorld();

    // Grounded Swipe Up -> Single Jump (charge still 1)
    stepWorld(world, emptyInput({ touchSwipe: 'up' }), DT);
    expect(world.player.airHopCharges).toBe(1);

    // Mid-air Swipe Up -> Double Jump (consumes 1 charge -> 0)
    for (let i = 0; i < 12; i++) stepWorld(world, emptyInput(), DT);
    const yBeforeDouble = world.player.y;
    stepWorld(world, emptyInput({ touchSwipe: 'up' }), DT);
    expect(world.player.airHopCharges).toBe(0);
    expect(world.player.vy).toBeLessThan(-480);
    for (let i = 0; i < 6; i++) stepWorld(world, emptyInput(), DT);
    expect(world.player.y).toBeLessThan(yBeforeDouble);

    // Attempt a 2nd mid-air hop while charge is 0 -> ignored
    const vxBefore = world.player.vx;
    const vyBefore = world.player.vy;
    stepWorld(world, emptyInput({ touchSwipe: 'right' }), DT);
    expect(world.player.vx).toBeCloseTo(vxBefore, 1);
    expect(world.player.vy).toBeGreaterThan(vyBefore);

    // Land to refill airHopCharges back to 1
    for (let i = 0; i < 80; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.player.grounded) break;
    }
    expect(world.player.grounded).toBe(true);
    expect(world.player.airHopCharges).toBe(1);
  });

  it('supports instant fast-swipes as well as an Apex Float decision window when pausing', () => {
    // 1. Fast double-swipe fires immediately during early ascent (within 3 ticks)
    const fastWorld = createTouchWorld();
    stepWorld(fastWorld, emptyInput({ touchSwipe: 'up' }), DT);
    stepWorld(fastWorld, emptyInput(), DT);
    stepWorld(fastWorld, emptyInput(), DT);
    expect(fastWorld.player.vy).toBeLessThan(-450);
    stepWorld(fastWorld, emptyInput({ touchSwipe: 'right' }), DT);
    expect(fastWorld.player.airHopCharges).toBe(0);
    expect(fastWorld.player.vx).toBeGreaterThan(270);

    // 2. Pausing at apex lingers softly when apexFloatDuration > 0 vs 0
    const floatWorld = createTouchWorld();
    const noFloatWorld = createTouchWorld();
    noFloatWorld.tuning.touchApexFloatDuration = 0;

    stepWorld(floatWorld, emptyInput({ touchSwipe: 'up' }), DT);
    stepWorld(noFloatWorld, emptyInput({ touchSwipe: 'up' }), DT);

    for (let i = 0; i < 42; i++) {
      stepWorld(floatWorld, emptyInput(), DT);
      stepWorld(noFloatWorld, emptyInput(), DT);
    }

    // Float world hangs visibly higher after 0.70s than zero-float world
    expect(floatWorld.player.y).toBeLessThan(noFloatWorld.player.y - 25);
  });

  it('executes free Swipe Down Fast-Fall Cancel without spending Air Charge, without dealing damage, and enables Down -> Air Hop', () => {
    const world = createTouchWorld();
    // Position above Zone 1 Dummy 1 (x = 185, y = 992)
    const dummy = world.enemies.find((e) => e.zoneId === 1 && e.kind === 'dummy')!;
    const dummyHpBefore = dummy.hp;
    world.player.x = dummy.x;
    world.player.y = 850;
    world.player.grounded = false;
    world.player.coyoteTimer = 0;
    world.player.airHopCharges = 1;

    // Swipe Down mid-air -> sharp fast-fall, 0 charges spent!
    stepWorld(world, emptyInput({ touchSwipe: 'down' }), DT);
    expect(world.player.touchFastFalling).toBe(true);
    expect(world.player.vy).toBeGreaterThanOrEqual(world.tuning.touchFastFallVy);
    expect(world.player.airHopCharges).toBe(1);

    // Spend the preserved Air Hop Charge mid-drop via Swipe Right!
    stepWorld(world, emptyInput(), DT);
    stepWorld(world, emptyInput({ touchSwipe: 'right' }), DT);
    expect(world.player.touchFastFalling).toBe(false);
    expect(world.player.airHopCharges).toBe(0);
    expect(world.player.vx).toBeGreaterThan(270);

    // Confirm pure movement fast-fall deals zero damage to dummy
    expect(dummy.hp).toBe(dummyHpBefore);
  });

  it('buffers a late swipe just before touchdown and executes it upon landing', () => {
    const world = createTouchWorld();
    world.player.x = 120;
    world.player.y = 975; // 19px above floor (1040 - 46 = 994)
    world.player.vy = 450;
    world.player.grounded = false;
    world.player.coyoteTimer = 0;
    world.player.airHopCharges = 0;

    // Swipe Right ~50ms before touching down while airHopCharges = 0
    stepWorld(world, emptyInput({ touchSwipe: 'right' }), DT);
    expect(world.player.touchSwipeBufferDir).toBe('right');

    // Step 5 ticks -> lands and immediately executes buffered Skip-Hop Right!
    for (let i = 0; i < 5; i++) {
      stepWorld(world, emptyInput(), DT);
    }
    expect(world.player.vx).toBeGreaterThan(200);
    expect(world.player.vy).toBeLessThan(-200);
    expect(world.player.touchSwipeBufferDir).toBeNull();
  });

  it('keeps Keyboard mode completely isolated from touchSwipe inputs', () => {
    const world = createWorld();
    expect(world.controlScheme).toBe('keyboard');
    for (let i = 0; i < 4; i++) stepWorld(world, emptyInput(), DT);

    stepWorld(world, emptyInput({ touchSwipe: 'up' }), DT);
    expect(world.player.grounded).toBe(true);
    expect(world.player.vy).toBe(0);
  });
});
