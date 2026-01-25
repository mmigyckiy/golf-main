import { clamp01, clamp, randn } from "./rng.js";

export function computeLandingX({ power, conditions, windFactor, windSpeed, windSigned = 0, skill, fatigue = 0, pressure = 0 }){
  const powerClamped = clamp01(power);
  const s = clamp01(skill);
  const f = clamp01(fatigue);
  const p = clamp01(pressure);
  let pEarly = clamp01(
    0.02 +
    powerClamped * 0.12 +
    (conditions === "ROUGH" ? 0.08 : 0) +
    windFactor * 0.06 -
    s * 0.08 +
    f * 0.10 +
    p * 0.12 +
    windFactor * 0.12
  );
  pEarly = Math.min(pEarly, 0.35);

  const expectedX = 1.10 + powerClamped * 3.8 - f * 0.25 - windFactor * 0.15 + windSigned * 0.18;
  let sigma = 0.18 + powerClamped * 0.55 + (conditions === "ROUGH" ? 0.25 : 0) + windFactor * 0.15 + windFactor * 0.20 - s * 0.20 + f * 0.25 + p * 0.30;
  sigma = clamp(sigma, 0.12, 1.25);
  pEarly = clamp01(pEarly + (-windSigned) * 0.06);

  let landingX;
  if(Math.random() < pEarly){
    landingX = 1.15 + Math.random() * 0.8;
  }else{
    landingX = expectedX + randn() * sigma;
  }
  if(conditions === "ROUGH") landingX -= 0.20;
  if(windSpeed > 12) landingX -= 0.10;
  landingX = clamp(landingX, 1.05, 8.0);

  return { landingX, pEarly, expectedX, sigma };
}
