export interface TuningConfig {
  // Movement & Platforming
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  airDecel: number;
  gravity: number;
  maxFallSpeed: number;
  apexGravityMult: number;
  apexVelocityThreshold: number;
  jumpVelocity: number;
  jumpCutMult: number;
  coyoteTime: number;
  jumpBufferTime: number;

  // Lance Combat
  thrustStartup: number;
  thrustActive: number;
  thrustRecovery: number;
  comboWindow: number;
  thrustReach: number;
  vorpalReach: number;
  upThrustReach: number;
  pogoReach: number;
  thrustDamage: number;
  vorpalDamage: number;
  pogoDamage: number;
  pogoBounceVelocity: number;
  thrustHitstop: number;
  pogoHitstop: number;

  // High Jump
  hjStartup: number;
  hjAscentVelocity: number;
  hjAscentDuration: number;
  hjApexDuration: number;
  hjApexInvulnDuration: number;
  hjApexGravityMult: number;
  hjDiveSpeed: number;
  hjMaxDiveAngleDeg: number;
  hjLockOnRange: number;
  hjLockOnHalfAngleDeg: number;
  hjBaseDamage: number;
  hjMaxHeightBonusMult: number;
  hjShockwaveRadius: number;
  hjShockwaveDamage: number;
  hjReboundVy: number;
  hjRecoveryDuration: number;
  hjDiveHitstop: number;
  hjCooldown: number;

  // Elusive Jump
  elusiveVx: number;
  elusiveVy: number;
  elusiveDuration: number;
  elusiveInvulnDuration: number;
  elusiveCooldown: number;

  // Lancet
  lancetCastDuration: number;
  lancetSpeed: number;
  lancetRange: number;
  lancetDamage: number;
  lancetCooldown: number;
  lancetHeal: number;
  lancetGaugeGain: number;

  // Dragon Arts
  gaugeMax: number;
  geirskogulCost: number;
  geirskogulDamage: number;
  geirskogulRange: number;
  geirskogulWidth: number;
  geirskogulCastDuration: number;
  stardiverCost: number;
  stardiverAscentVelocity: number;
  stardiverAscentDuration: number;
  stardiverDiveSpeed: number;
  stardiverDamage: number;
  stardiverRadius: number;
  stardiverHitstop: number;

  // Global Feel
  hitstopScale: number;

  // Touch Controls (Hop-Swipe Locomotion)
  touchSwipeThresholdPx: number;
  touchMaxAirHopCharges: number;
  touchHopVx: number;
  touchHopVy: number;
  touchSingleJumpVy: number;
  touchAirHopVx: number;
  touchAirHopVy: number;
  touchDoubleJumpVy: number;
  touchApexFloatDuration: number;
  touchApexFloatGravityMult: number;
  touchApexVelocityThreshold: number;
  touchFastFallVy: number;
  touchSwipeBufferTime: number;
}

export const DEFAULT_TUNING: TuningConfig = {
  runSpeed: 300,
  groundAccel: 2800,
  groundDecel: 2600,
  airAccel: 1950,
  airDecel: 1100,
  gravity: 1580,
  maxFallSpeed: 820,
  apexGravityMult: 0.62,
  apexVelocityThreshold: 95,
  jumpVelocity: -590,
  jumpCutMult: 0.48,
  coyoteTime: 0.1,
  jumpBufferTime: 0.11,

  thrustStartup: 0.045,
  thrustActive: 0.085,
  thrustRecovery: 0.11,
  comboWindow: 0.28,
  thrustReach: 68,
  vorpalReach: 86,
  upThrustReach: 78,
  pogoReach: 62,
  thrustDamage: 16,
  vorpalDamage: 22,
  pogoDamage: 15,
  pogoBounceVelocity: -510,
  thrustHitstop: 0.035,
  pogoHitstop: 0.05,

  hjStartup: 0.05,
  hjAscentVelocity: -980,
  hjAscentDuration: 0.23,
  hjApexDuration: 0.55,
  hjApexInvulnDuration: 0.28,
  hjApexGravityMult: 0.05,
  hjDiveSpeed: 1180,
  hjMaxDiveAngleDeg: 38,
  hjLockOnRange: 520,
  hjLockOnHalfAngleDeg: 42,
  hjBaseDamage: 38,
  hjMaxHeightBonusMult: 1.5,
  hjShockwaveRadius: 96,
  hjShockwaveDamage: 16,
  hjReboundVy: -420,
  hjRecoveryDuration: 0.16,
  hjDiveHitstop: 0.08,
  hjCooldown: 0.35,

  elusiveVx: 560,
  elusiveVy: -375,
  elusiveDuration: 0.24,
  elusiveInvulnDuration: 0.16,
  elusiveCooldown: 1.4,

  lancetCastDuration: 0.14,
  lancetSpeed: 860,
  lancetRange: 380,
  lancetDamage: 18,
  lancetCooldown: 3.0,
  lancetHeal: 1,
  lancetGaugeGain: 15,

  gaugeMax: 100,
  geirskogulCost: 50,
  geirskogulDamage: 48,
  geirskogulRange: 560,
  geirskogulWidth: 52,
  geirskogulCastDuration: 0.22,
  stardiverCost: 100,
  stardiverAscentVelocity: -1050,
  stardiverAscentDuration: 0.25,
  stardiverDiveSpeed: 1380,
  stardiverDamage: 95,
  stardiverRadius: 175,
  stardiverHitstop: 0.12,

  hitstopScale: 1.0,

  touchSwipeThresholdPx: 26,
  touchMaxAirHopCharges: 1,
  touchHopVx: 270,
  touchHopVy: -370,
  touchSingleJumpVy: -610,
  touchAirHopVx: 295,
  touchAirHopVy: -420,
  touchDoubleJumpVy: -540,
  touchApexFloatDuration: 0.28,
  touchApexFloatGravityMult: 0.14,
  touchApexVelocityThreshold: 85,
  touchFastFallVy: 760,
  touchSwipeBufferTime: 0.12,
};

export function cloneTuning(src: TuningConfig = DEFAULT_TUNING): TuningConfig {
  return { ...src };
}
