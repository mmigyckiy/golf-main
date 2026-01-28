/**
 * Drivix Game Constants
 * Centralized configuration to improve maintainability
 */

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  MENTAL_STATE: 'drivix.mental',
  PLAYER_PROFILE: 'drivix.profile',
  STATS: 'drivix.stats'
};

// =============================================================================
// PLAYER STATE / MENTAL
// =============================================================================

export const DECAY_RATES = {
  FATIGUE_PER_SEC: 0.015,
  PRESSURE_PER_SEC: 0.010
};

export const POWER_THRESHOLDS = {
  MAX_POWER: 0.92,
  HEAVY_POWER: 0.85
};

export const FATIGUE = {
  BASE_INCREMENT: 0.03,
  HEAVY_BONUS: 0.10,
  NORMAL_BONUS: 0.02,
  POWER_MULTIPLIER: 0.04
};

export const PRESSURE = {
  MAX_POWER_INCREMENT: 0.10,
  NORMAL_INCREMENT: 0.02,
  STREAK_CAP: 0.18,
  STREAK_MULTIPLIER: 0.04
};

export const RECOVERY = {
  FATIGUE_REDUCTION: 0.08,
  PRESSURE_REDUCTION: 0.05
};

// =============================================================================
// RISK ENGINE / LANDING CALCULATIONS
// =============================================================================

export const EARLY_SHOT = {
  BASE_PROBABILITY: 0.02,
  POWER_FACTOR: 0.12,
  ROUGH_PENALTY: 0.08,
  WIND_FACTOR: 0.06,
  SKILL_REDUCTION: 0.08,
  FATIGUE_PENALTY: 0.10,
  PRESSURE_PENALTY: 0.12,
  WIND_FACTOR_EXTRA: 0.12,
  MAX_PROBABILITY: 0.35,
  WIND_SIGNED_FACTOR: 0.06
};

export const LANDING = {
  BASE_X: 1.10,
  POWER_MULTIPLIER: 3.8,
  FATIGUE_PENALTY: 0.25,
  WIND_FACTOR_PENALTY: 0.15,
  WIND_SIGNED_BONUS: 0.18,
  EARLY_BASE: 1.15,
  EARLY_RANGE: 0.8,
  ROUGH_PENALTY: 0.20,
  HIGH_WIND_THRESHOLD: 12,
  HIGH_WIND_PENALTY: 0.10,
  MIN_X: 1.05,
  MAX_X: 8.0
};

export const SIGMA = {
  BASE: 0.18,
  POWER_MULTIPLIER: 0.55,
  ROUGH_PENALTY: 0.25,
  WIND_FACTOR: 0.15,
  WIND_FACTOR_EXTRA: 0.20,
  SKILL_REDUCTION: 0.20,
  FATIGUE_PENALTY: 0.25,
  PRESSURE_PENALTY: 0.30,
  MIN: 0.12,
  MAX: 1.25
};

// =============================================================================
// WIND SYSTEM
// =============================================================================

export const WIND = {
  MIN_SPEED: 0,
  MAX_SPEED: 18,
  MAX_WITH_GUST: 22,
  FACTOR_DIVISOR: 18
};

export const GUST = {
  DELAY_MIN_MS: 2500,
  DELAY_RANGE_MS: 3000,
  DURATION_MIN_MS: 600,
  DURATION_RANGE_MS: 800,
  PEAK_MIN: -1,
  PEAK_MAX: 1,
  DELTA_MULTIPLIER: 6
};

export const WIND_DIRECTION_SIGNED = {
  E: 0.35,
  W: -0.35,
  NE: 0.25,
  SE: 0.25,
  NW: -0.25,
  SW: -0.25,
  N: 0,
  S: 0
};

export const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// =============================================================================
// CONDITIONS
// =============================================================================

export const CONDITIONS = {
  FAIRWAY_PROBABILITY: 0.65,
  TYPES: {
    FAIRWAY: 'FAIRWAY',
    ROUGH: 'ROUGH'
  }
};

// =============================================================================
// SCORING / YARDS
// =============================================================================

export const YARDS = {
  CONVERSION_MULTIPLIER: 100,
  MIN: 0,
  MAX: 500
};

// =============================================================================
// TEMPO ARC (Radians - for swing_controls.js, swing_tempo.js)
// =============================================================================

export const TEMPO_ARC_RAD = {
  arcStart: Math.PI * 0.85,
  arcEnd: Math.PI * 2.15,
  motionStart: Math.PI * 1.05,
  motionEnd: Math.PI * 1.95,
  targetAngle: Math.PI * 1.5
};

// =============================================================================
// TEMPO ARC (Degrees - for swing_path.js)
// =============================================================================

export const TEMPO_ARC_DEG = {
  arcStartDeg: 210,
  arcEndDeg: 330,
  targetDeg: 270
};

// =============================================================================
// ALIGNMENT RING DEFAULTS
// =============================================================================

export const ALIGNMENT_RING = {
  cx: 60,
  cy: 60,
  r: 46,
  gapRad: (Math.PI / 180) * 20,
  FALLBACK_R: 54
};

// =============================================================================
// ATTACK ANGLE
// =============================================================================

export const ATTACK_ANGLE = {
  DEFAULT_SWEET_CENTER_DEG: 3.0,
  DEFAULT_SWEET_WIDTH_DEG: 2.0,
  MIN_DEG: -5,
  MAX_DEG: 5
};

// =============================================================================
// FLIGHT VISUALIZATION
// =============================================================================

export const FLIGHT = {
  VISUAL_MS: 2200,
  TRAIL_MAX_POINTS: 14,
  TRAIL_MAX_AGE_MS: 320,
  CRASH_DURATION_MS: 520,
  FLASH_DURATION_MS: 140,
  EXIT_DURATION_MS: 820
};

// =============================================================================
// CLUBS
// =============================================================================

export const CLUBS = [
  { id: 'putter', name: 'Putter', maxX: 2.2, carryMin: 2, carryMax: 18, accPenaltyMax: 4, growthFactor: 0.65, crashRisk: 0.70, holeTolerance: 0.14 },
  { id: 'wedge', name: 'Wedge', maxX: 3.0, carryMin: 35, carryMax: 110, accPenaltyMax: 10, growthFactor: 0.78, crashRisk: 0.85, holeTolerance: 0.11 },
  { id: 'iron7', name: '7 Iron', maxX: 3.8, carryMin: 90, carryMax: 160, accPenaltyMax: 14, growthFactor: 0.95, crashRisk: 1.00, holeTolerance: 0.09 },
  { id: 'iron5', name: '5 Iron', maxX: 4.4, carryMin: 120, carryMax: 190, accPenaltyMax: 16, growthFactor: 1.00, crashRisk: 1.08, holeTolerance: 0.085 },
  { id: 'wood', name: '3 Wood', maxX: 5.2, carryMin: 160, carryMax: 230, accPenaltyMax: 18, growthFactor: 1.10, crashRisk: 1.18, holeTolerance: 0.075 },
  { id: 'driver', name: 'Driver', maxX: 6.0, carryMin: 190, carryMax: 270, accPenaltyMax: 22, growthFactor: 1.18, crashRisk: 1.30, holeTolerance: 0.070 }
];

// Freeze all exported objects to prevent accidental mutation
Object.freeze(STORAGE_KEYS);
Object.freeze(DECAY_RATES);
Object.freeze(POWER_THRESHOLDS);
Object.freeze(FATIGUE);
Object.freeze(PRESSURE);
Object.freeze(RECOVERY);
Object.freeze(EARLY_SHOT);
Object.freeze(LANDING);
Object.freeze(SIGMA);
Object.freeze(WIND);
Object.freeze(GUST);
Object.freeze(WIND_DIRECTION_SIGNED);
Object.freeze(WIND_DIRECTIONS);
Object.freeze(CONDITIONS);
Object.freeze(YARDS);
Object.freeze(TEMPO_ARC_RAD);
Object.freeze(TEMPO_ARC_DEG);
Object.freeze(ALIGNMENT_RING);
Object.freeze(ATTACK_ANGLE);
Object.freeze(FLIGHT);
CLUBS.forEach(Object.freeze);
Object.freeze(CLUBS);
