import { createEnemy, type EnemySpec } from './enemies';
import type { Enemy, Signpost, TileRect, ZoneDef } from './types';

export interface LevelBlueprint {
  width: number;
  height: number;
  zones: ZoneDef[];
  tiles: TileRect[];
  enemySpecs: EnemySpec[];
  signposts: Signpost[];
}

export const LEVEL_BLUEPRINT: LevelBlueprint = {
  width: 6400,
  height: 1480,
  zones: [
    {
      id: 1,
      name: 'Zone 1 — Lance Courtyard',
      subtitle: 'Thrusts, Up-Thrust & Lance Pogo',
      xStart: 0,
      xEnd: 1150,
      spawnX: 96,
      spawnY: 994,
    },
    {
      id: 2,
      name: 'Zone 2 — High Jump Spire',
      subtitle: 'Ascent i-Frames, Apex Lock-On & Armor Break',
      xStart: 1150,
      xEnd: 2300,
      spawnX: 1200,
      spawnY: 994,
    },
    {
      id: 3,
      name: 'Zone 3 — Elusive Chasm',
      subtitle: 'Reverse Super-Vault & Backflip Evade',
      xStart: 2300,
      xEnd: 3400,
      spawnX: 2345,
      spawnY: 914,
    },
    {
      id: 4,
      name: 'Zone 4 — Sky Wyvern Perch',
      subtitle: 'Aerial Sustain, Lancet & Mid-Air Chaining',
      xStart: 3400,
      xEnd: 4450,
      spawnX: 3435,
      spawnY: 904,
    },
    {
      id: 5,
      name: 'Zone 5 — Dragon Altar',
      subtitle: 'Geirskogul Beam & Stardiver Meteor',
      xStart: 4450,
      xEnd: 5350,
      spawnX: 4490,
      spawnY: 934,
    },
    {
      id: 6,
      name: 'Zone 6 — Iron Wyvern Arena',
      subtitle: 'Full-Kit Mini-Boss Encounter',
      xStart: 5350,
      xEnd: 6400,
      spawnX: 5430,
      spawnY: 974,
    },
  ],

  tiles: [
    // Outer world bounds
    { id: 'bound-left', x: 0, y: 0, w: 32, h: 1480, kind: 'solid', zoneId: 1 },
    { id: 'bound-right', x: 6368, y: 0, w: 32, h: 1480, kind: 'solid', zoneId: 6 },
    { id: 'bound-ceil', x: 0, y: 0, w: 6400, h: 40, kind: 'solid', zoneId: 1 },

    // ZONE 1: Lance Courtyard (0..1150)
    { id: 'z1-floor', x: 32, y: 1040, w: 488, h: 440, kind: 'solid', zoneId: 1 },
    { id: 'z1-step', x: 245, y: 970, w: 96, h: 70, kind: 'solid', zoneId: 1 },
    { id: 'z1-upper-ow', x: 350, y: 865, w: 145, h: 16, kind: 'oneway', zoneId: 1 },
    { id: 'z1-pit-floor', x: 520, y: 1120, w: 600, h: 360, kind: 'solid', zoneId: 1 },
    { id: 'z1-spikes-l', x: 524, y: 1098, w: 256, h: 22, kind: 'spike', zoneId: 1 },
    { id: 'z1-mid-island', x: 785, y: 1005, w: 96, h: 115, kind: 'solid', zoneId: 1 },
    { id: 'z1-spikes-r', x: 886, y: 1098, w: 230, h: 22, kind: 'spike', zoneId: 1 },

    // ZONE 2: High Jump Spire (1150..2300)
    { id: 'z2-floor-l', x: 1120, y: 1040, w: 640, h: 440, kind: 'solid', zoneId: 2 },
    { id: 'z2-ledge-a', x: 1265, y: 910, w: 185, h: 16, kind: 'oneway', zoneId: 2 },
    { id: 'z2-ledge-b', x: 1465, y: 770, w: 225, h: 16, kind: 'oneway', zoneId: 2 },
    { id: 'z2-turret-pad', x: 1690, y: 740, w: 72, h: 42, kind: 'solid', zoneId: 2 },
    { id: 'z2-overlook', x: 1762, y: 780, w: 185, h: 26, kind: 'solid', zoneId: 2 },
    // Cracked stone floor sealing secret lower chamber (3 adjacent tiles)
    { id: 'z2-crack-1', x: 1760, y: 1040, w: 60, h: 28, kind: 'cracked', broken: false, zoneId: 2 },
    { id: 'z2-crack-2', x: 1820, y: 1040, w: 60, h: 28, kind: 'cracked', broken: false, zoneId: 2 },
    { id: 'z2-crack-3', x: 1880, y: 1040, w: 60, h: 28, kind: 'cracked', broken: false, zoneId: 2 },
    // Lower chamber walls, floor, and one-way exit steps back through the hole
    { id: 'z2-vault-wall-l', x: 1720, y: 1068, w: 40, h: 252, kind: 'solid', zoneId: 2 },
    { id: 'z2-vault-floor', x: 1720, y: 1320, w: 580, h: 160, kind: 'solid', zoneId: 2 },
    { id: 'z2-vault-wall-r', x: 2260, y: 1040, w: 40, h: 280, kind: 'solid', zoneId: 2 },
    { id: 'z2-vault-ow-1', x: 1785, y: 1215, w: 130, h: 16, kind: 'oneway', zoneId: 2 },
    { id: 'z2-vault-ow-2', x: 1785, y: 1120, w: 130, h: 16, kind: 'oneway', zoneId: 2 },
    // Upper ground past cracked floor
    { id: 'z2-floor-r', x: 1940, y: 1040, w: 320, h: 440, kind: 'solid', zoneId: 2 },
    { id: 'z2-step-exit', x: 2250, y: 998, w: 55, h: 42, kind: 'solid', zoneId: 2 },

    // ZONE 3: Elusive Chasm (2300..3400)
    { id: 'z3-launch-pad', x: 2300, y: 960, w: 240, h: 520, kind: 'solid', zoneId: 3 },
    { id: 'z3-pit-floor', x: 2540, y: 1120, w: 230, h: 360, kind: 'solid', zoneId: 3 },
    { id: 'z3-spikes', x: 2546, y: 1098, w: 218, h: 22, kind: 'spike', zoneId: 3 },
    { id: 'z3-land-pad', x: 2770, y: 940, w: 630, h: 540, kind: 'solid', zoneId: 3 },

    // ZONE 4: Sky Wyvern Perch (3400..4450)
    { id: 'z4-entry-pad', x: 3400, y: 950, w: 150, h: 530, kind: 'solid', zoneId: 4 },
    { id: 'z4-pit-floor', x: 3550, y: 1180, w: 900, h: 300, kind: 'solid', zoneId: 4 },
    { id: 'z4-pit-spikes', x: 3558, y: 1158, w: 884, h: 22, kind: 'spike', zoneId: 4 },
    { id: 'z4-plat-1', x: 3610, y: 900, w: 145, h: 24, kind: 'solid', zoneId: 4 },
    { id: 'z4-plat-2', x: 3820, y: 820, w: 145, h: 16, kind: 'oneway', zoneId: 4 },
    { id: 'z4-plat-3', x: 4030, y: 870, w: 150, h: 24, kind: 'solid', zoneId: 4 },
    { id: 'z4-plat-4', x: 4240, y: 930, w: 145, h: 16, kind: 'oneway', zoneId: 4 },

    // ZONE 5: Dragon Altar (4450..5350)
    { id: 'z5-floor', x: 4450, y: 980, w: 900, h: 500, kind: 'solid', zoneId: 5 },
    { id: 'z5-pierce-wall', x: 4770, y: 825, w: 28, h: 155, kind: 'solid', zoneId: 5 },

    // ZONE 6: Iron Wyvern Arena (5350..6400)
    { id: 'z6-floor', x: 5350, y: 1020, w: 1020, h: 460, kind: 'solid', zoneId: 6 },
    { id: 'z6-perch-l', x: 5450, y: 870, w: 160, h: 16, kind: 'oneway', zoneId: 6 },
    { id: 'z6-perch-r', x: 6080, y: 870, w: 160, h: 16, kind: 'oneway', zoneId: 6 },
  ],

  enemySpecs: [
    // Zone 1
    { kind: 'dummy', zoneId: 1, x: 185, y: 992, facing: -1 },
    { kind: 'dummy', zoneId: 1, x: 410, y: 817, facing: -1 },
    { kind: 'lantern', zoneId: 1, x: 590, y: 945 },
    { kind: 'lantern', zoneId: 1, x: 705, y: 930 },
    { kind: 'beetle', zoneId: 1, x: 805, y: 977, facing: 1, patrolMinX: 787, patrolMaxX: 840 },
    { kind: 'lantern', zoneId: 1, x: 920, y: 930 },
    { kind: 'lantern', zoneId: 1, x: 1030, y: 945 },

    // Zone 2
    { kind: 'turret', zoneId: 2, x: 1706, y: 706, facing: -1 },
    { kind: 'crystal', zoneId: 2, x: 1975, y: 1266 },
    { kind: 'dummy', zoneId: 2, x: 2075, y: 1272, facing: -1 },
    { kind: 'dummy', zoneId: 2, x: 2155, y: 1272, facing: -1 },
    { kind: 'shield_knight', zoneId: 2, x: 2070, y: 988, facing: -1 },
    { kind: 'dummy', zoneId: 2, x: 2175, y: 992, facing: -1 },

    // Zone 3
    { kind: 'lantern', zoneId: 3, x: 2642, y: 850 },
    { kind: 'sentinel', zoneId: 3, x: 3180, y: 888, facing: -1, patrolMinX: 2790, patrolMaxX: 3340 },

    // Zone 4
    { kind: 'lantern', zoneId: 4, x: 3760, y: 765 },
    { kind: 'lantern', zoneId: 4, x: 4180, y: 765 },
    { kind: 'wyvern', zoneId: 4, x: 3720, y: 720, facing: -1, patrolMinX: 3640, patrolMaxX: 3820 },
    { kind: 'wyvern', zoneId: 4, x: 3960, y: 650, facing: -1, patrolMinX: 3880, patrolMaxX: 4060 },
    { kind: 'wyvern', zoneId: 4, x: 4220, y: 710, facing: -1, patrolMinX: 4140, patrolMaxX: 4320 },

    // Zone 5
    { kind: 'crystal', zoneId: 5, x: 4570, y: 926 },
    { kind: 'shield_knight', zoneId: 5, x: 4845, y: 928, facing: -1 },
    { kind: 'dummy', zoneId: 5, x: 4920, y: 932, facing: -1 },
    { kind: 'dummy', zoneId: 5, x: 4985, y: 932, facing: -1 },
    { kind: 'shield_knight', zoneId: 5, x: 5110, y: 928, facing: -1 },
    { kind: 'sentinel', zoneId: 5, x: 5195, y: 928, facing: -1, patrolMinX: 5060, patrolMaxX: 5300 },
    { kind: 'dummy', zoneId: 5, x: 5270, y: 932, facing: -1 },

    // Zone 6
    {
      kind: 'iron_wyvern_boss',
      zoneId: 6,
      x: 5990,
      y: 948,
      facing: -1,
      patrolMinX: 5420,
      patrolMaxX: 6220,
    },
  ],

  signposts: [
    {
      x: 112,
      y: 1040,
      zoneId: 1,
      title: 'LANCE COURTYARD',
      lines: [
        '[J / X] 2-Hit Thrust  |  [W / Up + J / X] Up-Thrust',
        'Hold [S / Down + J / X] mid-air to LANCE POGO across lanterns & spikes!',
      ],
    },
    {
      x: 1185,
      y: 1040,
      zoneId: 2,
      title: 'HIGH JUMP SPIRE',
      lines: [
        '[K / C] High Jump grants Ascent i-frames to pass through Turret sweeps.',
        'Hold [K / C] in Apex to aim Lock-On Dive — breaks Shields & Cracked Floors!',
      ],
    },
    {
      x: 2350,
      y: 960,
      zoneId: 3,
      title: 'ELUSIVE CHASM',
      lines: [
        'Face LEFT & press [L / Shift] to Backflip Vault across the wide chasm!',
        'Use Elusive Jump i-frames to dodge the Sentinel’s orange lunge.',
      ],
    },
    {
      x: 3440,
      y: 950,
      zoneId: 4,
      title: 'SKY WYVERN PERCH',
      lines: [
        '[I / V] Lancet hurls a spectral drain spear (+1 HP & +15 Dragon Gauge).',
        'Chain Pogo bounces, Up-Thrusts, and High Jump Lock-On dives mid-air!',
      ],
    },
    {
      x: 4480,
      y: 980,
      zoneId: 5,
      title: 'DRAGON ALTAR',
      lines: [
        'Hit the Resonance Crystal to max Gauge! Press [U / F] to unleash Dragon Arts:',
        '50+ Gauge = Geirskogul (pierces walls & shields)  |  100 Gauge = Stardiver!',
      ],
    },
    {
      x: 5395,
      y: 1020,
      zoneId: 6,
      title: 'IRON WYVERN ARENA',
      lines: [
        'High Jump over Flame Sweeps, Elusive Jump Lunges, & shatter its Stagger Bar.',
        'Press [R] anytime to reset the zone or rematch the Iron Wyvern.',
      ],
    },
  ],
};

export function buildLevelTiles(): TileRect[] {
  return LEVEL_BLUEPRINT.tiles.map((t) => ({ ...t }));
}

export function buildLevelEnemies(): Enemy[] {
  return LEVEL_BLUEPRINT.enemySpecs.map((spec, idx) =>
    createEnemy(`enemy-${idx + 1}`, spec),
  );
}
