import { randInt } from "./rng.js";
import { CONDITIONS, WIND, WIND_DIRECTIONS } from "../constants.js";

export function createShotSetup(){
  const conditions = Math.random() < CONDITIONS.FAIRWAY_PROBABILITY 
    ? CONDITIONS.TYPES.FAIRWAY 
    : CONDITIONS.TYPES.ROUGH;
  const windSpeed = randInt(WIND.MIN_SPEED, WIND.MAX_SPEED);
  const windDir = WIND_DIRECTIONS[randInt(0, WIND_DIRECTIONS.length - 1)];
  const windFactor = windSpeed / WIND.FACTOR_DIVISOR;
  return { conditions, windSpeed, windDir, windFactor };
}
