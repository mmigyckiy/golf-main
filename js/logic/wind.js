import { clamp, clamp01, randInt } from "./rng.js";
import { WIND, GUST, WIND_DIRECTION_SIGNED } from "../constants.js";

function smoothstep(u){
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

export function initWind(baseSpeed, dir){
  const now = performance.now();
  const seed = Math.random();
  const nextDelay = GUST.DELAY_MIN_MS + Math.random() * GUST.DELAY_RANGE_MS;
  return {
    baseSpeed: clamp(Math.round(baseSpeed), WIND.MIN_SPEED, WIND.MAX_SPEED),
    dir,
    nextGustAt: now + nextDelay,
    gustStart: 0,
    gustEnd: 0,
    gustPeak: 0,
    gustActive: false,
    seed
  };
}

function scheduleNext(state, now){
  const delay = GUST.DELAY_MIN_MS + Math.random() * GUST.DELAY_RANGE_MS;
  state.nextGustAt = now + delay;
}

export function sampleWind(state, nowMs){
  if(!state){
    return { speed: 0, factor: 0, signed: 0, isGust: false, dir: "E" };
  }
  const now = nowMs || performance.now();

  // Activate gust if scheduled
  if(!state.gustActive && now >= state.nextGustAt){
    state.gustActive = true;
    state.gustStart = now;
    const dur = GUST.DURATION_MIN_MS + Math.random() * GUST.DURATION_RANGE_MS;
    state.gustEnd = now + dur;
    state.gustPeak = GUST.PEAK_MIN + Math.random() * (GUST.PEAK_MAX - GUST.PEAK_MIN + 1);
  }

  // Deactivate gust if ended
  if(state.gustActive && now > state.gustEnd){
    state.gustActive = false;
    state.gustPeak = 0;
    scheduleNext(state, now);
  }

  // Calculate gust delta
  let gustDelta = 0;
  if(state.gustActive){
    const u = (now - state.gustStart) / (state.gustEnd - state.gustStart);
    const env = smoothstep(u);
    gustDelta = state.gustPeak * env * GUST.DELTA_MULTIPLIER;
  }

  const speed = clamp(state.baseSpeed + gustDelta, WIND.MIN_SPEED, WIND.MAX_WITH_GUST);
  const factor = clamp01(speed / WIND.FACTOR_DIVISOR);

  const dir = state.dir || "E";
  const signed = WIND_DIRECTION_SIGNED[dir] || 0;

  return {
    speed,
    factor,
    signed,
    isGust: state.gustActive,
    gustLabel: state.gustActive ? "GUST" : "",
    dir
  };
}
