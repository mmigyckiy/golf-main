import { clamp01, clamp, randn } from "./rng.js";
import { EARLY_SHOT, LANDING, SIGMA, CONDITIONS } from "../constants.js";

export function computeLandingX({ power, conditions, windFactor, windSpeed, windSigned = 0, skill, fatigue = 0, pressure = 0 }){
  const powerClamped = clamp01(power);
  const s = clamp01(skill);
  const f = clamp01(fatigue);
  const p = clamp01(pressure);
  
  // Calculate early shot probability
  let pEarly = clamp01(
    EARLY_SHOT.BASE_PROBABILITY +
    powerClamped * EARLY_SHOT.POWER_FACTOR +
    (conditions === CONDITIONS.TYPES.ROUGH ? EARLY_SHOT.ROUGH_PENALTY : 0) +
    windFactor * EARLY_SHOT.WIND_FACTOR -
    s * EARLY_SHOT.SKILL_REDUCTION +
    f * EARLY_SHOT.FATIGUE_PENALTY +
    p * EARLY_SHOT.PRESSURE_PENALTY +
    windFactor * EARLY_SHOT.WIND_FACTOR_EXTRA
  );
  pEarly = Math.min(pEarly, EARLY_SHOT.MAX_PROBABILITY);

  // Calculate expected landing position
  const expectedX = LANDING.BASE_X + 
    powerClamped * LANDING.POWER_MULTIPLIER - 
    f * LANDING.FATIGUE_PENALTY - 
    windFactor * LANDING.WIND_FACTOR_PENALTY + 
    windSigned * LANDING.WIND_SIGNED_BONUS;
  
  // Calculate variance
  let sigma = SIGMA.BASE + 
    powerClamped * SIGMA.POWER_MULTIPLIER + 
    (conditions === CONDITIONS.TYPES.ROUGH ? SIGMA.ROUGH_PENALTY : 0) + 
    windFactor * SIGMA.WIND_FACTOR + 
    windFactor * SIGMA.WIND_FACTOR_EXTRA - 
    s * SIGMA.SKILL_REDUCTION + 
    f * SIGMA.FATIGUE_PENALTY + 
    p * SIGMA.PRESSURE_PENALTY;
  sigma = clamp(sigma, SIGMA.MIN, SIGMA.MAX);
  
  pEarly = clamp01(pEarly + (-windSigned) * EARLY_SHOT.WIND_SIGNED_FACTOR);

  // Determine landing position
  let landingX;
  if(Math.random() < pEarly){
    landingX = LANDING.EARLY_BASE + Math.random() * LANDING.EARLY_RANGE;
  }else{
    landingX = expectedX + randn() * sigma;
  }
  
  // Apply penalties
  if(conditions === CONDITIONS.TYPES.ROUGH) landingX -= LANDING.ROUGH_PENALTY;
  if(windSpeed > LANDING.HIGH_WIND_THRESHOLD) landingX -= LANDING.HIGH_WIND_PENALTY;
  landingX = clamp(landingX, LANDING.MIN_X, LANDING.MAX_X);

  return { landingX, pEarly, expectedX, sigma };
}
