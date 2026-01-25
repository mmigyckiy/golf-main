import { clamp, clamp01, randInt } from "./rng.js";

function smoothstep(u){
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

export function initWind(baseSpeed, dir){
  const now = performance.now();
  const seed = Math.random();
  const nextDelay = 2500 + Math.random() * 3000;
  return {
    baseSpeed: Math.max(0, Math.min(18, Math.round(baseSpeed))),
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
  const delay = 2500 + Math.random() * 3000;
  state.nextGustAt = now + delay;
}

export function sampleWind(state, nowMs){
  if(!state){
    return { speed: 0, factor: 0, signed: 0, isGust: false, dir: "E" };
  }
  const now = nowMs || performance.now();

  if(!state.gustActive && now >= state.nextGustAt){
    state.gustActive = true;
    state.gustStart = now;
    const dur = 600 + Math.random() * 800;
    state.gustEnd = now + dur;
    state.gustPeak = -1 + Math.random() * 2; // -1..1
  }

  if(state.gustActive && now > state.gustEnd){
    state.gustActive = false;
    state.gustPeak = 0;
    scheduleNext(state, now);
  }

  let gustDelta = 0;
  if(state.gustActive){
    const u = (now - state.gustStart) / (state.gustEnd - state.gustStart);
    const env = smoothstep(u);
    gustDelta = state.gustPeak * env * 6; // mph swing up to ~6
  }

  const speed = clamp(state.baseSpeed + gustDelta, 0, 22);
  const factor = clamp01(speed / 18);

  const dir = state.dir || "E";
  const signed =
    dir === "E" ? 0.35 :
    dir === "W" ? -0.35 :
    dir === "NE" || dir === "SE" ? 0.25 :
    dir === "NW" || dir === "SW" ? -0.25 :
    0;

  return {
    speed,
    factor,
    signed,
    isGust: state.gustActive,
    gustLabel: state.gustActive ? "GUST" : "",
    dir
  };
}
