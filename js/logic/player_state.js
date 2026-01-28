import { clamp01 } from "./rng.js";
import { 
  STORAGE_KEYS, 
  DECAY_RATES, 
  POWER_THRESHOLDS, 
  FATIGUE, 
  PRESSURE, 
  RECOVERY 
} from "../constants.js";

function loadRaw(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.MENTAL_STATE);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(err){
    console.warn("[mental] load failed", err);
    return null;
  }
}

function persist(state){
  try{
    localStorage.setItem(STORAGE_KEYS.MENTAL_STATE, JSON.stringify(state));
  }catch(err){
    console.warn("[mental] save failed", err);
  }
}

function decayState(state){
  const now = Date.now();
  const lastTs = Number(state.lastTs) || now;
  const dtSec = Math.max(0, (now - lastTs) / 1000);
  const fatigue = Math.max(0, (state.fatigue || 0) - dtSec * DECAY_RATES.FATIGUE_PER_SEC);
  const pressure = Math.max(0, (state.pressure || 0) - dtSec * DECAY_RATES.PRESSURE_PER_SEC);
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
  const isMax = power >= POWER_THRESHOLDS.MAX_POWER;
  const isHeavy = power >= POWER_THRESHOLDS.HEAVY_POWER;
  const next = { ...state };
  next.maxStreak = isMax ? (next.maxStreak || 0) + 1 : Math.max(0, (next.maxStreak || 0) - 1);
  next.fatigue = clamp01(
    (next.fatigue || 0) + 
    FATIGUE.BASE_INCREMENT + 
    (isHeavy ? FATIGUE.HEAVY_BONUS : FATIGUE.NORMAL_BONUS) + 
    (power * FATIGUE.POWER_MULTIPLIER)
  );
  next.pressure = clamp01(
    (next.pressure || 0) + 
    (isMax ? PRESSURE.MAX_POWER_INCREMENT : PRESSURE.NORMAL_INCREMENT) + 
    Math.min(PRESSURE.STREAK_CAP, PRESSURE.STREAK_MULTIPLIER * next.maxStreak * next.maxStreak)
  );
  next.lastTs = Date.now();
  persist(next);
  return next;
}

export function applyRecoveryOnRoundEnd(current){
  const state = decayState(current || loadPlayerMental());
  const next = {
    ...state,
    fatigue: Math.max(0, (state.fatigue || 0) - RECOVERY.FATIGUE_REDUCTION),
    pressure: Math.max(0, (state.pressure || 0) - RECOVERY.PRESSURE_REDUCTION),
    lastTs: Date.now()
  };
  persist(next);
  return next;
}
