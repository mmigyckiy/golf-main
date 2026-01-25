import { clamp01 } from "./rng.js";

const KEY = "drivix.mental";

function loadRaw(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(err){
    console.warn("[mental] load failed", err);
    return null;
  }
}

function persist(state){
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
  }catch(err){
    console.warn("[mental] save failed", err);
  }
}

function decayState(state){
  const now = Date.now();
  const lastTs = Number(state.lastTs) || now;
  const dtSec = Math.max(0, (now - lastTs) / 1000);
  const fatigue = Math.max(0, (state.fatigue || 0) - dtSec * 0.015);
  const pressure = Math.max(0, (state.pressure || 0) - dtSec * 0.010);
  return {
    fatigue: clamp01(fatigue),
    pressure: clamp01(pressure),
    maxStreak: state.maxStreak || 0,
    lastTs: now
  };
}

export function loadPlayerMental(){
  const base = loadRaw() || { fatigue: 0, pressure: 0, maxStreak: 0, lastTs: Date.now() };
  const decayed = decayState(base);
  persist(decayed);
  return decayed;
}

export function savePlayerMental(state){
  const next = decayState(state);
  persist(next);
  return next;
}

export function applyAttemptMental({ power }, current){
  const state = decayState(current || loadPlayerMental());
  const isMax = power >= 0.92;
  const isHeavy = power >= 0.85;
  const next = { ...state };
  next.maxStreak = isMax ? (next.maxStreak || 0) + 1 : Math.max(0, (next.maxStreak || 0) - 1);
  next.fatigue = clamp01((next.fatigue || 0) + 0.03 + (isHeavy ? 0.10 : 0.02) + (power * 0.04));
  next.pressure = clamp01((next.pressure || 0) + (isMax ? 0.10 : 0.02) + Math.min(0.18, 0.04 * next.maxStreak * next.maxStreak));
  next.lastTs = Date.now();
  persist(next);
  return next;
}

export function applyRecoveryOnRoundEnd(current){
  const state = decayState(current || loadPlayerMental());
  const next = {
    ...state,
    fatigue: Math.max(0, (state.fatigue || 0) - 0.08),
    pressure: Math.max(0, (state.pressure || 0) - 0.05),
    lastTs: Date.now()
  };
  persist(next);
  return next;
}
