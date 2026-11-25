import type { SoundEvent } from '../engine/audio';
import type { CameraState } from '../engine/camera';
import type { Rect, Vec2 } from '../engine/math';
import type { ControlScheme, SwipeDirection } from '../engine/touchInput';
import type { TuningConfig } from '../engine/tuning';

export type PlayerState =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'FALL'
  | 'THRUST'
  | 'POGO'
  | 'HJ_STARTUP'
  | 'HJ_ASCENT'
  | 'HJ_APEX'
  | 'HJ_DIVE'
  | 'HJ_RECOVERY'
  | 'ELUSIVE'
  | 'LANCET'
  | 'GEIRSKOGUL'
  | 'STARDIVER_ASCENT'
  | 'STARDIVER_DIVE'
  | 'HURT';

export type LanceAttackKind = 'true_thrust' | 'vorpal_thrust' | 'up_thrust' | 'pogo';

export interface Afterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  state: PlayerState;
  alpha: number;
  color: string;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: PlayerState;
  stateTimer: number;
  grounded: boolean;
  canCutJump: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  dropThroughTimer: number;
  invulnTimer: number;
  hurtFlashTimer: number;
  evadeTextCooldown: number;

  hp: number;
  maxHp: number;
  dragonGauge: number;

  comboStep: 0 | 1;
  comboWindowTimer: number;
  airHighJumpAvailable: boolean;
  airElusiveAvailable: boolean;

  airHopCharges: number;
  apexFloatTimer: number;
  touchFastFalling: boolean;
  touchSwipeBufferDir: SwipeDirection | null;
  touchSwipeBufferTimer: number;

  hjCooldown: number;
  elusiveCooldown: number;
  lancetCooldown: number;

  hjStartY: number;
  hjApexStartY: number;
  hjDiveDir: Vec2;
  hjLockTargetId: string | null;
  hjManualOverride: boolean;
  hjDiveTriggeredSound: boolean;

  lancetSpawned: boolean;
  geirskogulSpawned: boolean;

  activeAttackKind: LanceAttackKind | null;
  attackHitIds: string[];

  lastSafeX: number;
  lastSafeY: number;

  scarfNodes: Vec2[];
  afterimages: Afterimage[];
}

export type TileKind = 'solid' | 'oneway' | 'cracked' | 'spike';

export interface TileRect extends Rect {
  id: string;
  kind: TileKind;
  broken?: boolean;
  zoneId: number;
}

export type EnemyKind =
  | 'dummy'
  | 'lantern'
  | 'beetle'
  | 'shield_knight'
  | 'turret'
  | 'sentinel'
  | 'wyvern'
  | 'crystal'
  | 'iron_wyvern_boss';

export type EnemyAIState =
  | 'IDLE'
  | 'PATROL'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'COOLDOWN'
  | 'STAGGERED'
  | 'DEAD';

export interface Enemy {
  id: string;
  kind: EnemyKind;
  zoneId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;

  hp: number;
  maxHp: number;
  stagger: number;
  maxStagger: number;
  staggeredTimer: number;
  alive: boolean;
  respawnTimer: number;

  indestructible: boolean;
  frontShield: boolean;
  pogoable: boolean;
  contactDamage: number;

  aiState: EnemyAIState;
  aiTimer: number;
  telegraphTimer: number;
  hitFlashTimer: number;
  hoverPhase: number;

  homeX: number;
  homeY: number;
  patrolMinX: number;
  patrolMaxX: number;

  bossMoveIndex: number;
  bossActivated: boolean;
  bossAttackKind: 'flame_sweep' | 'armored_lunge' | 'aerial_barrage' | null;
  bossShotsFired: number;
}

export type ProjectileKind =
  | 'lancet'
  | 'geirskogul'
  | 'turret_wave'
  | 'ember'
  | 'boss_flame';

export interface Projectile {
  id: string;
  owner: 'player' | 'enemy';
  kind: ProjectileKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  damage: number;
  pierceWalls: boolean;
  pierceEnemies: boolean;
  hitIds: string[];
  life: number;
  maxLife: number;
  rangeTraveled: number;
  maxRange: number;
}

export interface DrainOrb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  healAmount: number;
  gaugeGain: number;
  life: number;
}

export interface Shockwave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  isStardiver: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface Signpost {
  x: number;
  y: number;
  zoneId: number;
  title: string;
  lines: string[];
}

export interface ZoneDef {
  id: number;
  name: string;
  subtitle: string;
  xStart: number;
  xEnd: number;
  spawnX: number;
  spawnY: number;
}

export interface SandboxCheats {
  infiniteGauge: boolean;
  zeroCooldowns: boolean;
  godMode: boolean;
}

export interface ActiveHitbox {
  rect: Rect;
  kind: LanceAttackKind | 'hj_dive' | 'stardiver_dive';
  damage: number;
  staggerDamage: number;
  isPogo: boolean;
  armorBreak: boolean;
  knockbackX: number;
  knockbackY: number;
}

export interface WorldState {
  player: Player;
  tiles: TileRect[];
  enemies: Enemy[];
  projectiles: Projectile[];
  drainOrbs: DrainOrb[];
  shockwaves: Shockwave[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  zones: ZoneDef[];
  signposts: Signpost[];
  activeZoneId: number;
  zoneBannerTimer: number;
  levelWidth: number;
  levelHeight: number;
  hitstopTimer: number;
  time: number;
  nextEntityId: number;
  tuning: TuningConfig;
  controlScheme: ControlScheme;
  cheats: SandboxCheats;
  events: SoundEvent[];
  camera: CameraState;
}
