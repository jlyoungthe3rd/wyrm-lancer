import { describe, expect, it } from 'vitest';
import { emptyInput } from '../engine/input';
import { createWorld, stepWorld, warpToZone } from '../game/world';

const DT = 1 / 60;

describe('Dragoon Combat & Enemy Interactions', () => {
  it('Shield Knight blocks frontal normal Lance thrusts but takes Armor Break damage from High Jump Dive', () => {
    const world = createWorld();
    warpToZone(world, 2);
    const knight = world.enemies.find((e) => e.zoneId === 2 && e.kind === 'shield_knight')!;
    const initialHp = knight.hp;

    // Stand directly in front (left) of facing-left Shield Knight
    world.player.x = knight.x - 42;
    world.player.y = 994;
    world.player.facing = 1;
    for (let i = 0; i < 4; i++) stepWorld(world, emptyInput(), DT);

    // Frontal True Thrust gets blocked
    stepWorld(world, emptyInput({ lancePressed: true }), DT);
    let sawClang = false;
    for (let i = 0; i < 10; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.events.includes('shield_clang')) sawClang = true;
    }
    expect(sawClang).toBe(true);
    expect(knight.hp).toBe(initialHp);

    // Now High Jump dive onto the Shield Knight -> Armor Break + Rebound!
    world.player.x = knight.x + 2;
    world.player.y = knight.y - 160;
    world.player.state = 'HJ_DIVE';
    world.player.hjApexStartY = knight.y - 220;
    world.player.hjDiveDir = { x: 0, y: 1 };
    world.player.attackHitIds = [];

    let hitImpact = false;
    for (let i = 0; i < 20; i++) {
      stepWorld(world, emptyInput(), DT);
      if (world.events.includes('hj_impact')) {
        hitImpact = true;
        break;
      }
    }
    expect(hitImpact).toBe(true);
    expect(knight.hp).toBeLessThan(initialHp);
    expect(world.player.vy).toBeLessThan(-200); // Dragoon Rebound hop
  });

  it('High Jump ascent i-frames pass safely through Zone 2 Turret sweep waves without taking damage', () => {
    const world = createWorld();
    warpToZone(world, 2);
    world.player.x = 1520;
    world.player.y = 724; // Standing on Ledge B right in front of Turret wave path
    for (let i = 0; i < 6; i++) stepWorld(world, emptyInput(), DT);

    // Spawn a turret wave flying straight toward the player
    world.projectiles.push({
      id: 'test-wave',
      owner: 'enemy',
      kind: 'turret_wave',
      x: 1580,
      y: 710,
      w: 42,
      h: 26,
      vx: -350,
      vy: 0,
      damage: 1,
      pierceWalls: false,
      pierceEnemies: false,
      hitIds: [],
      life: 0,
      maxLife: 2,
      rangeTraveled: 0,
      maxRange: 500,
    });

    const hpBefore = world.player.hp;
    // Trigger High Jump right as wave sweeps through
    stepWorld(world, emptyInput({ highJumpPressed: true, highJumpHeld: true }), DT);
    for (let i = 0; i < 15; i++) {
      stepWorld(world, emptyInput({ highJumpHeld: true }), DT);
    }

    expect(world.player.hp).toBe(hpBefore);
    expect(world.events).not.toContain('hurt');
  });

  it('Iron Wyvern Boss accumulates stagger, enters STAGGERED, and takes 1.5x damage', () => {
    const world = createWorld();
    warpToZone(world, 6);
    const boss = world.enemies.find((e) => e.kind === 'iron_wyvern_boss')!;
    for (let i = 0; i < 5; i++) stepWorld(world, emptyInput(), DT);
    expect(boss.bossActivated).toBe(true);

    // Land repeated High Jump Dives to break its 100-point Stagger bar
    for (let hit = 0; hit < 3; hit++) {
      world.player.x = boss.x + 25;
      world.player.y = boss.y - 90;
      world.player.state = 'HJ_DIVE';
      world.player.hjApexStartY = boss.y - 160;
      world.player.hjDiveDir = { x: 0, y: 1 };
      world.player.attackHitIds = [];
      for (let t = 0; t < 16; t++) {
        stepWorld(world, emptyInput(), DT);
        if (world.events.includes('hj_impact')) break;
      }
      // Clear hitstop between test dives
      world.hitstopTimer = 0;
    }

    expect(boss.aiState).toBe('STAGGERED');
    const hpWhileStaggered = boss.hp;

    // Strike staggered boss with True Thrust -> 1.5x damage (16 * 1.5 = 24)
    world.player.x = boss.x - 32;
    world.player.y = 974;
    world.player.facing = 1;
    world.player.state = 'IDLE';
    world.player.grounded = true;
    world.player.comboWindowTimer = 0;
    stepWorld(world, emptyInput({ lancePressed: true }), DT);
    for (let t = 0; t < 10; t++) {
      stepWorld(world, emptyInput(), DT);
    }

    expect(hpWhileStaggered - boss.hp).toBe(Math.round(world.tuning.thrustDamage * 1.5));
  });
});
