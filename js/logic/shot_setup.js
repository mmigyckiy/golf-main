import { randInt } from "./rng.js";

export function createShotSetup(){
  const conditions = Math.random() < 0.65 ? "FAIRWAY" : "ROUGH";
  const windSpeed = randInt(0, 18);
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const windDir = dirs[randInt(0, dirs.length - 1)];
  const windFactor = windSpeed / 18;
  return { conditions, windSpeed, windDir, windFactor };
}
