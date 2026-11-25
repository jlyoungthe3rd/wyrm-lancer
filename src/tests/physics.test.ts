import { describe, expect, it } from 'vitest';
import { emptyInput } from '../engine/input';
import { createWorld, stepWorld, warpToZone } from '../game/world';

const DT = 1 / 60;

function stepTicks(
  world: ReturnType<typeof createWorld>,
  ticks: number,
  makeInput = () => emptyInput(),
): void {
  for (let i = 0; i < ticks; i++) {
    stepWorld(world, makeInput(), DT);
  }
}

describe('Platformer Physics & Controls', () => {
  it('lands stably on solid ground and stops falling', () => {
    const world = createWorld();
    stepTicks(world, 30);

    expect(world.player.grounded).toBe(true);
    expect(world.player.vy).toBe(0);
    expect(world.player.y + world.player.h).toBeCloseTo(1040, 1);
    expect(world.player.state).toBe('IDLE');
  });

  it('supports one-way jump-through from below and drop-through via Down + Jump', () => {
    const world = createWorld();
    // Stand on Zone 1 step block (x: 245..341, y: 970), 105px below one-way deck (x: 350..495, y: 865)
    world.player.x = 310;
    world.player.y = 924;
    stepTicks(world, 4);
    expect(world.player.grounded).toBe(true);

    // Jump up and right onto the one-way platform
    stepWorld(world, emptyInput({ moveX: 1, jumpPressed: true, jumpHeld: true }), DT);
    stepTicks(world, 24, () => emptyInput({ moveX: 1, jumpHeld: true }));

    // Settle onto the one-way platform
    stepTicks(world, 25);
    expect(world.player.grounded).toBe(true);
    expect(world.player.y + world.player.h).toBeCloseTo(865, 1);

    // Press Down + Jump to drop cleanly through the one-way platform
    stepWorld(
      world,
      emptyInput({ moveY: 1, jumpPressed: true, jumpHeld: true }),
      DT,
    );
    stepTicks(world, 10);
    expect(world.player.grounded).toBe(false);
    expect(world.player.y + world.player.h).toBeGreaterThan(875);
  });

  it('allows jumping within coyote time after walking off a ledge, and denies after expiry', () => {
    const world = createWorld();
    // Stand right at the right edge of Zone 1 floor (x = 520) already moving right
    world.player.x = 517;
    world.player.y = 994;
    stepTicks(world, 2);
    expect(world.player.grounded).toBe(true);
    world.player.vx = 300;

    // Walk right off the ledge for 2 ticks (~33ms < 100ms coyote time)
    stepTicks(world, 2, () => emptyInput({ moveX: 1 }));
    expect(world.player.grounded).toBe(false);
    expect(world.player.coyoteTimer).toBeGreaterThan(0);

    // Coyote jump succeeds!
    stepWorld(world, emptyInput({ jumpPressed: true, jumpHeld: true }), DT);
    expect(world.player.vy).toBeLessThan(0);
    expect(world.player.state).toBe('JUMP');

    // Now test expired coyote time
    const world2 = createWorld();
    world2.player.x = 517;
    world2.player.y = 994;
    stepTicks(world2, 2);
    world2.player.vx = 300;
    stepTicks(world2, 9, () => emptyInput({ moveX: 1 })); // ~150ms > 100ms
    expect(world2.player.grounded).toBe(false);
    expect(world2.player.coyoteTimer).toBe(0);

    const vyBefore = world2.player.vy;
    stepWorld(world2, emptyInput({ jumpPressed: true, jumpHeld: true }), DT);
    expect(world2.player.vy).toBeGreaterThanOrEqual(vyBefore);
  });

  it('buffers jump pressed slightly before landing and executes on touchdown', () => {
    const world = createWorld();
    warpToZone(world, 1);
    world.player.x = 120;
    world.player.y = 960; // 34px above floor (1040 - 46 = 994)
    world.player.vy = 450;
    world.player.grounded = false;

    // Step 3 ticks (~50ms) and press jump slightly before landing
    stepTicks(world, 2);
    stepWorld(world, emptyInput({ jumpPressed: true, jumpHeld: true }), DT);
    stepTicks(world, 6, () => emptyInput({ jumpHeld: true }));

    expect(world.player.vy).toBeLessThan(-400);
    expect(world.player.state).toBe('JUMP');
  });

  it('cuts upward jump velocity when Jump is released early', () => {
    const worldFull = createWorld();
    stepTicks(worldFull, 4);
    stepWorld(worldFull, emptyInput({ jumpPressed: true, jumpHeld: true }), DT);
    stepTicks(worldFull, 15, () => emptyInput({ jumpHeld: true }));

    const worldCut = createWorld();
    stepTicks(worldCut, 4);
    stepWorld(worldCut, emptyInput({ jumpPressed: true, jumpHeld: true }), DT);
    stepTicks(worldCut, 3, () => emptyInput({ jumpHeld: true }));
    stepWorld(worldCut, emptyInput({ jumpReleased: true, jumpHeld: false }), DT);
    stepTicks(worldCut, 12);

    expect(worldCut.player.y).toBeGreaterThan(worldFull.player.y);
  });
});
