import { clamp01, lerp } from './utils/math.js';
import { ATTACK_ANGLE } from './constants.js';

const DEFAULTS = {
  active: false,
  value01: 0,
  deg: 0,
  locked: false,
  lockedDeg: null,
  sweetCenterDeg: ATTACK_ANGLE.DEFAULT_SWEET_CENTER_DEG,
  sweetWidthDeg: ATTACK_ANGLE.DEFAULT_SWEET_WIDTH_DEG
};

let getStateFn = null;
let isArmingFn = null;
let els = {
  meter: null,
  track: null,
  runner: null,
  sweet: null,
  readout: null
};

function fmtDeg(d){
  const s = d >= 0 ? "+" : "−";
  return `${s}${Math.abs(d).toFixed(1)}°`;
}
function degFrom01(p){ 
  return lerp(ATTACK_ANGLE.MIN_DEG, ATTACK_ANGLE.MAX_DEG, clamp01(p)); 
}
function pFromDeg(d){ 
  return clamp01((d - ATTACK_ANGLE.MIN_DEG) / (ATTACK_ANGLE.MAX_DEG - ATTACK_ANGLE.MIN_DEG)); 
}

function getState(){
  return typeof getStateFn === "function" ? getStateFn() : null;
}

function ensureState(){
  const state = getState();
  if(!state) return null;
  state.attackAngle = state.attackAngle || {};
  for (const [key, val] of Object.entries(DEFAULTS)){
    if(!(key in state.attackAngle)) state.attackAngle[key] = val;
  }
  return state;
}

function cacheElements(){
  els.meter = document.getElementById("attackAngleMeter");
  els.track = els.meter?.querySelector(".attack-angle__track") 
    || document.querySelector("#attackAngle .attack-angle__track")
    || document.querySelector(".attack-angle__track");
  els.runner = document.getElementById("attackAngleRunner");
  els.sweet = document.getElementById("attackAngleSweet");
  els.readout = document.getElementById("attackAngleReadout");
}

export function initAttackAngle(getState, opts = {}){
  getStateFn = getState;
  isArmingFn = typeof opts.isArming === "function"
    ? opts.isArming
    : (s) => s?.phase === "ARMING";
  cacheElements();
  ensureState();
  renderAttackAngle();
}

export function renderAttackAngle(){
  const state = ensureState();
  if(!state) return;
  const { track, runner, sweet, readout } = els;
  if(!track || !runner || !readout) return;

  const locked = state.attackAngle.locked && Number.isFinite(state.attackAngle.lockedDeg);
  const deg = locked ? state.attackAngle.lockedDeg : state.attackAngle.deg;
  
  // Update readout text
  readout.textContent = fmtDeg(deg);

  // Clamp the rotation angle for visual display (e.g., -8° to +8°)
  const clampedDeg = Math.max(-8, Math.min(8, deg));
  
  // Set CSS variable for club rotation (negative because positive attack = club angled up)
  track.style.setProperty("--attackAngleDeg", `${-clampedDeg * 4}deg`);
}

export function updateAttackAngle(ts, dtMs){
  const state = ensureState();
  if(!state || !isArmingFn(state)) return;
  const now = Number.isFinite(ts) ? ts : performance.now();
  const t0 = state.timestamps?.holdStartMs ?? now;
  const t = Math.max(0, (now - t0) * 0.001);
  const fatigue = clamp01(state.fatigue?.level ?? 0);
  const speed = 1.2 + fatigue * 0.4;
  const s = 0.5 + 0.5 * Math.sin(t * speed);
  const p = 0.25 + 0.60 * s;

  state.attackAngle.active = true;
  state.attackAngle.locked = false;
  state.attackAngle.value01 = p;
  state.attackAngle.deg = degFrom01(p);
  renderAttackAngle();
}

export function lockAttackAngle(){
  const state = ensureState();
  if(!state) return;
  state.attackAngle.locked = true;
  state.attackAngle.lockedDeg = state.attackAngle.deg;
  renderAttackAngle();
}

export function resetAttackAngle(){
  const state = ensureState();
  if(!state) return;
  state.attackAngle.active = false;
  state.attackAngle.value01 = 0;
  state.attackAngle.deg = 0;
  state.attackAngle.locked = false;
  state.attackAngle.lockedDeg = null;
  renderAttackAngle();
}
