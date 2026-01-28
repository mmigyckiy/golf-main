// Long Drive — Crash-style single swing
// Feature checklist:
// - Perfect Window + Signature Moment overlay (perfect strike or new best)
// - Longest Today (per-day best) with localStorage reset
// - Target line evaluation (ON LINE / SHORT / LONG) at 300 yd
// - Risk selector (Calm/Aggressive) influencing crash window
// UI/game state focused on distance and cashout timing
// DEAD-CODE CANDIDATES (removed in this cleanup):
// - computeSweetSpot(): no references found
// - computeEfficiency(): no references found
// - getEnvWindFromSample(): no references found

// == Config / Constants ==
import { isWithinPerfectWindow, loadLongestToday, saveLongestToday, evaluateTarget, genCrashForRisk, getGrowthForRisk, showSignatureOverlay } from "./longdrive-extras.js";
import { clamp, clamp01 } from "./logic/rng.js";
import { createShotSetup } from "./logic/shot_setup.js";
import { computeLandingX } from "./logic/risk_engine.js";
import { renderTopbar } from "./ui/topbar.js";
import { loadPlayerMental, applyAttemptMental, applyRecoveryOnRoundEnd } from "./logic/player_state.js";
import { initWind, sampleWind } from "./logic/wind.js";
import { SwingControls } from "./swing_controls.js";
import { SwingPath } from "./swing_path.js";
import { 
  initAttackAnglePlane, 
  updateAttackAnglePlane, 
  lockAttackAnglePlane, 
  resetAttackAnglePlane, 
  getAttackAngleValue,
  isInsideAttackWindow,
  renderAttackAnglePlane 
} from "./attack_angle_plane.js";

const FLIGHT_MS_VISUAL = 2200;
const STORAGE_KEY = "golfcentral.longdrive.v1";
const BASE_CARRY = 220; // yards at 1.00x
const CARRY_PER_X = 55; // yards gained per +1x
const MAX_SCREEN_YARDS = 300;
const TARGET_DISTANCE = 300;
const MAX_YD = 500;
const LONG_DRIVE_UNLOCK_PROB = 0.12;
const X_CAP = 9.99;
const TEMPO_POWER = { min: 0.55, max: 1.05 };
const X_TO_YARDS = 100;
const RISK_K = 0.010;
const RISK_P = 2.2;
const DANGER_X_START = 2.2;
const DANGER_X_FULL = 3.6;
const DBG_PHYS = false;

const FEATURES = {
  tempoInertia: true,
  windowBreath: true,
  fatigue: true,
  wind: true
};

const RoundPhase = Object.freeze({
  IDLE: "IDLE",
  ARMING: "ARMING",
  SWING: "SWING",
  FLIGHT: "FLIGHT",
  END: "END"
});

// UI phase attribute for CSS-driven widget emphasis
function setUiPhaseAttr(phase){
  const map = {
    [RoundPhase.IDLE]: "idle",
    [RoundPhase.ARMING]: "hold",
    [RoundPhase.SWING]: "flight",
    [RoundPhase.FLIGHT]: "flight",
    [RoundPhase.END]: "end"
  };
  document.body.dataset.uiPhase = map[phase] || "idle";
}

const $ = (...ids) => {
  for (const id of ids) {
    if (!id) continue;
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
};

// == UI Refs ==
const ui = {
  tempoControl: $("swingTempoControl"),
  tempoHead: $("swingTempoRunner", "swingTempoHead"),
  tempoWindow: $("swingTempoFill", "swingTempoWindow"),
  tempoFill: $("swingTempoFill"),
  tempoRunner: $("swingTempoRunner"),
  tempoPct: $("swingTempoPct"),
  swingWind: $("swingWind"),
  swingWindArrow: $("swingWindArrow"),
  swingWindValue: $("swingWindValue"),
  alignmentRing: $("alignmentRing"),
  alignmentBase: $("alignmentBase"),
  alignmentSweet: $("alignmentSweet"),
  alignmentMarker: $("alignmentMarker"),
  alignmentRunner: $("alignmentRunner"),
  attackAngle: $("attackAngle"),
  attackAngleMeter: $("attackAngleMeter"),
  attackAngleSweet: $("attackAngleSweet"),
  attackAngleRunner: $("attackAngleRunner"),
  attackAngleReadout: $("attackAngleReadout"),
  status: $("roundStatus", "status"),
  coef: $("coef"),
  lastFlights: $("lastFlightsList"),
  impactReadout: $("impactReadout"),
  nameLabel: $("playerNameLabel", "playerNameChip", "playerName"),
  nameSecondary: $("playerName"),
  handicap: $("handicapValue", "playerHcpChip", "playerHcp"),
  modal: $("welcomeModal"),
  nameInput: $("playerNameInput"),
  enterBtn: $("welcomeEnterBtn", "enterClub"),
  skipBtn: $("welcomeSkipBtn"),
  autoToggle: $("autoCashoutEnabled"),
  autoInput: $("autoCashoutInput", "autoX"),
  changePlayer: $("changePlayer"),
  resetPlayer: $("resetPlayer"),
  perfectLabel: $("perfectWindowLabel"),
  targetLine: $("targetLine"),
  targetDistanceLabel: $("targetDistanceLabel"),
  longestTodayLabel: $("longestTodayLabel"),
  targetEvalLabel: $("targetEvalLabel"),
  riskButtons: Array.from(document.querySelectorAll(".gc-segmented__btn[data-risk]")),
  pbValue: $("pbValue"),
  best3AvgValue: $("best3AvgValue")
};

const ANIM_STATUSES = {
  ready: "ready",
  live: "flying",
  locked: "locked",
  crashed: "crashed",
  crash: "crashed"
};

const statsApi = (typeof window !== "undefined" && window.drivixStats) ? window.drivixStats : null;
const defaultProfile = { name: "", attempts: [], pb: 0, best3avg: 0, handicapYd: 0 };
let profile = { ...defaultProfile };
const multiplierState = { live: 1, frozen: null, lastRoundId: null };
const memberEditor = {
  trigger: null,
  popover: null,
  input: null,
  saveBtn: null,
  cancelBtn: null
};

// == State ==
const state = {
  phase: RoundPhase.IDLE,
  impactDelayMs: 80,
  impactUntilTs: 0,
  impactStartX: 1,
  lastSwing: { wasSweetSpot: false },
  hand: {
    value: 0.5,
    speed: 0.85,
    dir: 1,
    sweetCenter: 0.5,
    sweetWidth: 0.16,
    holding: false,
    released: false
  },
  timestamps: {
    holdStartMs: 0,
    releaseMs: 0,
    endMs: 0
  },
  flags: {
    crashed: false
  },
  wind: {
    baseDirRad: 0,
    baseStrength: 0,
    gust: 0,
    dirJitter: 0,
    seed: 0,
    mph: 0,
    dirDeg: 0,
    targetGust: 0,
    targetDirJitter: 0,
    nextTargetAt: 0
  },
  fatigue: {
    level: 0,
    streakHighPower: 0,
    lastRoundTs: 0
  },
  alignment: {
    value: 0,
    dir: 1,
    speed: 0,
    active: false,
    sweetCenter: 0,
    sweetWidth: 0.45,
    frozenValue: 0,
    hit: false
  },
  attackAngle: {
    active: false,
    value01: 0,
    deg: 0,
    locked: false,
    lockedDeg: null,
    affectsGameplay: false,
    sweetCenterDeg: 3.0,
    sweetWidthDeg: 2.0
  },
  stability: 0,
  sweetSpot: {
    baseCenterX: 2.7,
    baseWidthX: 0.55,
    centerX: 2.7,
    widthX: 0.55,
    minX: 2.42,
    maxX: 2.98
  },
  mental: {
    data: null
  },
  runtime: {
    mainRafId: null
  },
  playerName: "Guest",
  handicap: 0,
  player: {
    fatigue: 0
  },
  env: {
    wind: { mph: 0, dirDeg: 0, gust: 0 }
  },
  bestDistance: 0,
  lastDistanceYards: 0,
  liveDistanceYd: 0,
  finalDistanceYd: null,
  power: 0,
  powerHoldStart: 0,
  powerLocked: false,
  controls: {
    tempoRelease: null
  },
  tempo: {
    holding: false,
    released: false,
    angleDeg: 0,
    lockedAngleDeg: null
  },
  impact: {
    live: 0,
    locked: null,
    isPerfect: false,
    swingScore: 0,
    attackScore: 0
  },
  shot: {
    tempo01: 0,
    path01: 0,
    attackDeg: 0,
    locked: false,
    score01: 0,
    components: { tempo: 0, path: 0, attack: 0 }
  },
  lastFlights: [],
  longestToday: { date: null, best: 0 },
  targetDistance: TARGET_DISTANCE,
  targetEval: "—",
  riskMode: "calm",
  growthRate: getGrowthForRisk("calm"),
  perfectWindow: null,
  currentX: 1,
  prevX: 1,
  shotSetup: null,
  running: false,
  rafId: null,
  lastTs: 0,
  lastTrailTs: 0,
  signatureTimer: null,
  round: {
    state: "IDLE", // IDLE | RUNNING | CASHED | CRASHED
    distanceLiveYards: 0,
    baseCarryPotentialYards: 0,
    baseDistanceYardsLive: 0,
    startTsMs: 0,
    elapsedMs: 0,
    xLocked: null,
    finalDistanceYards: 0,
    flightProgress: 0,
    landingX: 0,
    expectedX: 0,
    setup: null,
    wind: null,
    windSnapshot: null,
    windLast: null,
    windInitialized: false,
    sweetSpot: null,
    sweetSpotFinal: null,
    longDriveUnlocked: false,
    lockedX: null,
    matchScore: null,
    faceAngleNorm: 0,
    bias: 0,
    faceAlignedAtRelease: false,
    faceAlignedQuality01: 0
  },
  _lastWindHudAt: 0,
  _windFrozenOnce: false,
  ui: { canStart: true }
};
state._lastWindHudAt = 0;
state._windFrozenOnce = false;
state.ui = state.ui || { canStart: true };

const ANALYTICS_STORAGE_KEY = "drivix.stats";
const ANALYTICS_MAX = 12;
const ANALYTICS_RELEASE_MAX = 8;
const analytics = {
  recentDistances: [],
  recentSweet: [],
  recentRelease: []
};

// == Storage ==
function loadFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const data = JSON.parse(raw);
      if(Array.isArray(data.lastFlights)) state.lastFlights = data.lastFlights.slice(0, 10);
    }
  }catch(err){
    console.warn("[LD] failed to load", err);
  }
  state.longestToday = loadLongestToday();
}

function loadAnalyticsState(){
  try{
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(Array.isArray(data.recentDistances)){
      analytics.recentDistances = data.recentDistances.map(v => Number(v) || 0).slice(-ANALYTICS_MAX);
    }
    if(Array.isArray(data.recentSweet)){
      analytics.recentSweet = data.recentSweet.map(v => !!v).slice(-ANALYTICS_MAX);
    }
    if(Array.isArray(data.recentRelease)){
      analytics.recentRelease = data.recentRelease.map(v => Number(v)).filter(v => Number.isFinite(v)).slice(-ANALYTICS_MAX);
    }
  }catch(err){
    console.warn("[LD] analytics load failed", err);
  }
}

function saveAnalyticsState(){
  try{
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    const payload = {
      ...base,
      recentDistances: analytics.recentDistances.slice(-ANALYTICS_MAX),
      recentSweet: analytics.recentSweet.slice(-ANALYTICS_MAX),
      recentRelease: analytics.recentRelease.slice(-ANALYTICS_MAX)
    };
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(payload));
  }catch(err){
    console.warn("[LD] analytics save failed", err);
  }
}

function saveToStorage(){
  const payload = {
    lastFlights: state.lastFlights.slice(0, 10)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function syncStateWithProfile(){
  state.playerName = profile.name || "Guest";
  state.handicap = Math.max(0, Math.round(profile.handicapYd || 0));
  state.bestDistance = Math.max(0, Math.round(profile.pb || 0));
}

function hydrateProfile(){
  if(statsApi?.loadPlayerProfile){
    const loaded = statsApi.loadPlayerProfile();
    profile = { ...defaultProfile, ...(loaded || {}) };
  }else{
    profile = { ...defaultProfile };
  }
  syncStateWithProfile();
}

function persistProfile(nextProfile){
  profile = { ...defaultProfile, ...(profile || {}), ...(nextProfile || {}) };
  syncStateWithProfile();
  if(statsApi?.savePlayerProfile){
    statsApi.savePlayerProfile(profile);
  }
  renderStats(profile);
}

function computeFallbackMetrics(attempts){
  const list = Array.isArray(attempts) ? attempts : [];
  if(list.length === 0){
    return { pb: 0, best3avg: 0, handicapYd: 0 };
  }
  const distances = list.map(a => Number(a.distance) || 0);
  const pb = Math.max(0, ...distances);
  const windowDistances = list.slice(-20).map(a => Number(a.distance) || 0).sort((a, b) => b - a);
  let pool = windowDistances.slice(0, 3);
  if(list.length < 3){
    pool = distances;
  }
  const avg = pool.length ? pool.reduce((acc, v) => acc + v, 0) / pool.length : 0;
  const handicapRaw = list.length === 0 ? null : computeHandicap(avg);
  const handicapYd = handicapRaw == null ? 0 : handicapRaw;
  return {
    pb,
    best3avg: Math.round(avg * 10) / 10,
    handicapYd
  };
}

function recordAttempt(distanceYd, crashed){
  if(statsApi?.addAttempt){
    const updated = statsApi.addAttempt(distanceYd, crashed, Date.now());
    persistProfile({ ...updated, name: profile.name || state.playerName });
    return;
  }
  const attempt = { distance: Number(distanceYd) || 0, crashed: !!crashed, ts: Date.now() };
  const attempts = [...(profile.attempts || []), attempt].slice(-100);
  const metrics = computeFallbackMetrics(attempts);
  persistProfile({ attempts, ...metrics, name: state.playerName });
}

function setStatus(text){
  if(ui.status) ui.status.textContent = text;
  const key = String(text || "").toLowerCase();
  const mapped = ANIM_STATUSES[key];
  if(mapped) document.body.dataset.status = mapped;
}

function fmtX(x){ return "x" + x.toFixed(2); }

function fmtDistance(y){ return `${Math.max(0, Math.round(y))} yd`; }

function lerp(a, b, t){ return a + (b - a) * t; }

function round2(v){ return Math.round(v * 100) / 100; }

function yardsFromX(x){
  const val = Math.round((Number(x) || 0) * X_TO_YARDS);
  return clamp(val, 0, MAX_YD);
}

function seededRand(seed){
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function initRoundWind(seed){
  const base = Number.isFinite(seed) ? seed : Date.now();
  const dirRad = seededRand(base * 0.77) * Math.PI * 2;
  const strength = 0.25 + seededRand(base * 1.31) * 0.55;
  state.wind.seed = base;
  state.wind.baseDirRad = dirRad;
  state.wind.baseStrength = strength;
  state.wind.gust = 0;
  state.wind.dirJitter = 0;
  state.wind.targetGust = (seededRand(base * 2.11) - 0.5) * 0.4;
  state.wind.targetDirJitter = (seededRand(base * 2.73) - 0.5) * (Math.PI / 18);
  state.wind.nextTargetAt = performance.now() + 1200;
}

function updateRoundWind(now){
  if(!state.round.windInitialized) return;
  if(now >= state.wind.nextTargetAt){
    const s = state.wind.seed + Math.floor(now / 1000);
    state.wind.targetGust = (seededRand(s * 1.17) - 0.5) * 0.4;
    state.wind.targetDirJitter = (seededRand(s * 1.91) - 0.5) * (Math.PI / 18);
    state.wind.nextTargetAt = now + 1200 + seededRand(s * 2.41) * 800;
  }
  state.wind.gust = lerp(state.wind.gust, state.wind.targetGust, 0.02);
  state.wind.dirJitter = lerp(state.wind.dirJitter, state.wind.targetDirJitter, 0.02);
  const mph = clamp(Math.round((state.wind.baseStrength + state.wind.gust) * 20), 0, 20);
  const dirDeg = Math.round(((state.wind.baseDirRad + state.wind.dirJitter) * 180) / Math.PI) % 360;
  state.wind.mph = mph;
  state.wind.dirDeg = dirDeg < 0 ? dirDeg + 360 : dirDeg;
}


function initSweetSpot(){
  const baseCenterX = state.riskMode === "aggressive" ? 3.05 : 2.7;
  const baseWidthX = state.riskMode === "aggressive" ? 0.4 : 0.55;
  const centerX = baseCenterX;
  const widthX = baseWidthX;
  const minX = Math.max(1, centerX - widthX / 2);
  const maxX = Math.min(5, centerX + widthX / 2);
  state.sweetSpot = {
    baseCenterX,
    baseWidthX,
    centerX,
    widthX,
    minX,
    maxX
  };
  state.round.sweetSpot = { minX: round2(minX), maxX: round2(maxX), centerX, widthX };
  state.perfectWindow = { start: minX, end: maxX };
}

function updateStability(dtSec){
  const baseGrowthPerSecond = state.riskMode === "aggressive" ? 0.16 : 0.1;
  const xFactor = clamp01((state.currentX - 1) / 4);
  const windFactor = clamp01((state.wind.mph || 0) / 18);
  const fatigueFactor = clamp01(state.player.fatigue + state.fatigue.level);
  const delta = dtSec * baseGrowthPerSecond * (0.45 + 0.75 * xFactor + 0.35 * windFactor + 0.35 * fatigueFactor);
  state.stability = clamp01((state.stability || 0) + delta);
}

function updateSweetSpot(dtSec){
  if(!state.sweetSpot) initSweetSpot();
  const windFactor = clamp01((state.wind.mph || 0) / 18);
  const fatigueFactor = clamp01(state.player.fatigue + state.fatigue.level);
  const baseWidthX = state.sweetSpot.baseWidthX;
  const windSigned = Math.sin((state.wind.dirDeg || 0) * Math.PI / 180);
  const drift = windSigned * windFactor * 0.15;
  let centerX = state.sweetSpot.centerX + (dtSec * drift);
  let widthX = baseWidthX * (1 - 0.45 * state.stability) * (1 - 0.25 * windFactor) * (1 - 0.25 * fatigueFactor);
  widthX = clamp(widthX, 0.18, baseWidthX);
  const half = widthX / 2;
  centerX = clamp(centerX, 1 + half, 5 - half);
  const minX = Math.max(1, centerX - half);
  const maxX = Math.min(5, centerX + half);
  state.sweetSpot.centerX = centerX;
  state.sweetSpot.widthX = widthX;
  state.sweetSpot.minX = minX;
  state.sweetSpot.maxX = maxX;
  state.round.sweetSpot = { minX: round2(minX), maxX: round2(maxX), centerX, widthX };
  state.perfectWindow = { start: minX, end: maxX };
}

function computeMatchScore(tempoHit, faceHit){
  if(tempoHit && faceHit) return 1;
  if(tempoHit || faceHit) return 0.6;
  return 0.2;
}

function computeHandicap(expectedYd){
  if(!Number.isFinite(expectedYd) || expectedYd <= 0) return null;
  return Math.round(expectedYd - 300);
}

function ensureMainLoop(){
  if(state.runtime.mainRafId) return;
  const loop = (ts) => {
    state.runtime.mainRafId = requestAnimationFrame(loop);
    try{
      tick(ts);
    }catch(err){
      console.error("[tick error]", err);
    }
  };
  state.runtime.mainRafId = requestAnimationFrame(loop);
}

function resetMultiplier(roundId){
  multiplierState.live = 1;
  multiplierState.frozen = null;
  multiplierState.lastRoundId = roundId || null;
}

function resetRoundState(reason = "manual"){
  console.log("[ROUND] reset", { reason, prev: state.round?.state });
  state.running = false;
  state.lastTs = 0;
  state.finalDistanceYd = null;
  state.round = state.round || {};
  state.round.state = "IDLE";
  state.round.startTsMs = 0;
  state.round.startTs = 0;
  state.round.endTs = 0;
  state.round.elapsedMs = 0;
  state.round.distanceLiveYards = 0;
  state.round.baseCarryPotentialYards = 0;
  state.round.baseDistanceYardsLive = 0;
  state.round.xLocked = null;
  state.round.finalDistanceYards = 0;
  state.round.flightProgress = 0;
  state.round.landingX = 0;
  state.round.expectedX = 0;
  state.round.setup = null;
  state.round.wind = null;
  state.round.windSnapshot = null;
  state.round.windLast = null;
  state.round.windInitialized = false;
  state.round.sweetSpot = null;
  state.round.sweetSpotFinal = null;
  state.round.longDriveUnlocked = false;
  state.round.lockedX = null;
  state.round.quality = null;
  state.round.maxX = null;
  state.round.matchScore = null;
  state.round.faceAngleNorm = 0;
  state.round.bias = 0;
  state.round.faceAlignedAtRelease = false;
  state.round.faceAlignedQuality01 = 0;
  state.stability = 0;
  state.alignment.value = 0;
  state.alignment.dir = 1;
  state.alignment.speed = 0;
  state.alignment.speedDeg = 0;
  state.alignment.active = false;
  state.alignment.sweetCenter = 0;
  state.alignment.hit = false;
  state.alignment.frozenValue = 0;
  resetAttackAnglePlane();
  state.sweetSpot = {
    baseCenterX: 2.7,
    baseWidthX: 0.55,
    centerX: 2.7,
    widthX: 0.55,
    minX: 2.42,
    maxX: 2.98
  };
  state.flags.crashed = false;
  state._windFrozenOnce = false;
  state._lastWindHudAt = 0;
  state.power = 0;
  state.powerHoldStart = 0;
  state.powerLocked = false;
  state.controls = state.controls || {};
  state.controls.tempoRelease = null;
  if(state.exit) state.exit.active = false;
  if(state.crash) state.crash.active = false;
  state.tempo = state.tempo || {};
  state.tempo.holding = false;
  state.tempo.released = false;
  state.tempo.angle = 0;
  state.tempo.lockedAngleDeg = null;
  resetSwingTempoMeter();
  state.impact.live = 0;
  state.impact.locked = null;
  state.impact.isPerfect = false;
  state.impact.swingScore = 0;
  state.impact.attackScore = 0;
  state.ui = state.ui || {};
  state.ui.canStart = true;
  setButtons();
}

function resetRound(reason = "manual"){
  resetRoundState(reason);
  state.phase = RoundPhase.IDLE;
  setUiPhaseAttr(state.phase);
  state.timestamps.holdStartMs = 0;
  state.timestamps.releaseMs = 0;
  state.timestamps.endMs = 0;
  state.flags.crashed = false;
  state.impactUntilTs = 0;
  state.impactStartX = 1;
  state.round.state = "IDLE";
  state.round.flightProgress = 0;
  state.running = false;
  state.impactUntilTs = 0;
  state.impactStartX = 1;
  state.stability = 0;
  state.impact.live = 0;
  state.impact.locked = null;
  state.impact.isPerfect = false;
  state.impact.swingScore = 0;
  state.impact.attackScore = 0;
  initSweetSpot();
  resetSwingTempoMeter();
  if(ui.perfectLabel){
    ui.perfectLabel.classList.remove("gc-sweetspot--breathing");
    ui.perfectLabel.classList.remove("gc-sweetspot--pulse");
  }
  
  // Reset all 3 widgets
  SwingControls.resetTempo();
  SwingPath.resetPath();
  resetAttackAnglePlane();
  
  // Reset shot state
  state.shot = {
    tempo01: 0,
    path01: 0,
    attackDeg: 0,
    locked: false,
    score01: 0,
    components: { tempo: 0, path: 0, attack: 0 }
  };
}

function updateMultiplierState(){
  const roundId = state.round.startTsMs || null;
  if(roundId && roundId !== multiplierState.lastRoundId){
    resetMultiplier(roundId);
  }
  const isRunning = state.round.state === "RUNNING" && state.running && !state.round.finalDistanceYards;
  if(isRunning){
    const liveX = Math.max(1, Number(state.currentX || 1));
    multiplierState.live = Math.max(multiplierState.live || 1, liveX);
    multiplierState.frozen = null;
  }else{
    if(multiplierState.frozen === null){
      multiplierState.frozen = multiplierState.live || Math.max(1, Number(state.currentX || 1));
    }
  }
  return multiplierState.frozen ?? multiplierState.live ?? 1;
}

function getDistanceToShow(){
  const finalVal = state.finalDistanceYd ?? state.round?.finalDistanceYards;
  const live = state.liveDistanceYd ?? state.round?.distanceLiveYards ?? 0;
  return finalVal != null ? finalVal : live;
}

function easeOutCubic(t){
  const clamped = Math.max(0, Math.min(1, t));
  const inv = 1 - clamped;
  return 1 - inv * inv * inv;
}

function scoreNeedleInWindow(pos, start, end){
  const span = Math.max(0.001, end - start);
  const center = start + span / 2;
  const dist = Math.abs(pos - center);
  const score = 1 - dist / (span / 2);
  return clamp01(score);
}

function computeTempoPower(headPos){
  const start = Number.isFinite(state.tempo?.windowStart) ? state.tempo.windowStart : 0.6;
  const end = Number.isFinite(state.tempo?.windowEnd) ? state.tempo.windowEnd : 0.8;
  const center = (start + end) / 2;
  const halfSpan = Math.max(0.001, (end - start) / 2);
  const dist = Math.abs(headPos - center);
  const accuracy = clamp01(1 - dist / halfSpan);
  const weighted = Math.pow(accuracy, 1.1);
  const power = TEMPO_POWER.min + weighted * (TEMPO_POWER.max - TEMPO_POWER.min);
  return clamp(power, TEMPO_POWER.min, TEMPO_POWER.max);
}

// Convert degrees to 0-1 range matching attack_angle_plane.js (-6 to +6)
function pFromDeg(d){ return clamp01((d + 6) / 12); }

function renderSwingTempo(headPos){
  const p = clamp01(Number.isFinite(headPos) ? headPos : (state.tempo?.headPos ?? 0));
  state.tempo = state.tempo || {};
  state.tempo.headPos = p;
  const fill = document.getElementById("swingTempoFill");
  if(fill) fill.style.height = `${(p * 100).toFixed(2)}%`;
  const runner = document.getElementById("swingTempoRunner");
  if(runner){
    const tube = document.getElementById("swingTempoTube");
    if(tube){
      const pad = 8;
      const tubeH = tube.clientHeight || 0;
      const runnerH = runner.offsetHeight || 0;
      const travel = Math.max(0, tubeH - runnerH - pad * 2);
      const bottomPx = pad + travel * p;
      runner.style.bottom = `${bottomPx}px`;
    }else{
      runner.style.bottom = `calc(${(p * 100).toFixed(2)}% + 8px)`;
    }
  }
  const pct = document.getElementById("swingTempoPct");
  if(pct) pct.textContent = `${Math.round(p * 100)}%`;
}

function resetSwingTempoMeter(){
  renderSwingTempo(0);
}

function computeSwingStability(){
  const tempoQuality = Number.isFinite(state.round?.tempoScore) ? clamp01(state.round.tempoScore) : 0.6;
  const alignQuality = Number.isFinite(state.round?.faceAlignedQuality01) ? clamp01(state.round.faceAlignedQuality01) : (state.alignment?.hit ? 1 : 0.6);
  const stability = clamp01(0.55 * tempoQuality + 0.45 * alignQuality);
  state.swing = state.swing || {};
  state.swing.stability = stability;
  return stability;
}

function gaussianScore(delta, sigma){
  const s = Math.max(1e-6, sigma);
  return Math.exp(-(delta * delta) / (2 * s * s));
}

function scoreFromSweet(value01, sweetCenter01, sweetWidth01){
  const v = clamp01(value01);
  const c = Number.isFinite(sweetCenter01) ? clamp01(sweetCenter01) : 0.5;
  const w = Number.isFinite(sweetWidth01) ? Math.max(0.02, Math.min(1, sweetWidth01)) : 0.20;
  const half = Math.max(1e-4, w / 2);
  const delta = (v - c) / half;
  return clamp01(gaussianScore(delta, 1.0));
}

function getSwingPathValue01(){
  const v = state?.alignment?.value;
  if(Number.isFinite(v)) return clamp01(v);
  const tempoHead = state?.tempo?.headPos ?? state?.tempo?.value;
  return Number.isFinite(tempoHead) ? clamp01(tempoHead) : 0.5;
}

function getSwingPathSweet(){
  const c = state?.alignment?.sweetCenter ?? state?.tempo?.sweetCenter ?? state?.timing?.sweetCenter;
  const w = state?.alignment?.sweetWidth ?? state?.tempo?.sweetWidth ?? state?.timing?.sweetWidth;
  return { center: Number.isFinite(c) ? clamp01(c) : 0.5, width: Number.isFinite(w) ? w : 0.20 };
}

function getAttackAngleValue01(){
  if(!state.attackAngle?.affectsGameplay) return 0.5;
  const v = state?.attack?.value ?? state?.attackAngle?.value01 ?? state?.attackAngle?.value;
  return Number.isFinite(v) ? clamp01(v) : 0.5;
}

function getAttackAngleSweet(){
  if(!state.attackAngle?.affectsGameplay) return { center: 0.5, width: 0.20 };
  const cDeg = state?.attackAngle?.sweetCenterDeg;
  const wDeg = state?.attackAngle?.sweetWidthDeg;
  const c = Number.isFinite(cDeg) ? pFromDeg(cDeg) : (state?.attack?.sweetCenter ?? state?.attackAngle?.sweetCenter);
  // Use 12 to match -6 to +6 degree range in attack_angle_plane.js
  const w = Number.isFinite(wDeg) ? clamp01(wDeg / 12) : (state?.attack?.sweetWidth ?? state?.attackAngle?.sweetWidth);
  return { center: Number.isFinite(c) ? clamp01(c) : 0.5, width: Number.isFinite(w) ? w : 0.20 };
}

function updateImpactQuality(){
  const swingV = getSwingPathValue01();
  const swingSweet = getSwingPathSweet();
  const attackV = getAttackAngleValue01();
  const attackSweet = getAttackAngleSweet();

  const swingScore = scoreFromSweet(swingV, swingSweet.center, swingSweet.width);
  const attackScore = scoreFromSweet(attackV, attackSweet.center, attackSweet.width);
  const impact = Math.sqrt(Math.max(0, swingScore * attackScore));
  state.impact.swingScore = swingScore;
  state.impact.attackScore = attackScore;
  state.impact.live = clamp01(impact);
  state.impact.isPerfect = (swingScore > 0.92 && attackScore > 0.92);
}

function applyImpactToYards(yards){
  const q = (state.impact.locked ?? state.impact.live ?? 0);
  const mult = lerp(0.94, 1.08, clamp01(q));
  return clamp(Math.round(yards * mult), 0, MAX_YD);
}

function impactRiskMultiplier(){
  const q = (state.impact.locked ?? state.impact.live ?? 0);
  return lerp(1.12, 0.88, clamp01(q));
}

function ensureImpactReadout(){
  if(ui.impactReadout) return;
  const host = document.querySelector(".gc-controls__row--meta") || document.getElementById("swingWind")?.parentElement;
  if(!host) return;
  const el = document.createElement("div");
  el.id = "impactReadout";
  el.className = "gc-mutedSmall";
  el.style.marginRight = "10px";
  el.textContent = "IMPACT: —";
  host.insertBefore(el, host.firstChild);
  ui.impactReadout = el;
}

function renderImpactReadout(){
  if(!ui.impactReadout) return;
  const q = (state.impact.locked ?? state.impact.live);
  if(!Number.isFinite(q)){
    ui.impactReadout.textContent = "IMPACT: —";
    return;
  }
  const pct = Math.round(clamp01(q) * 100);
  ui.impactReadout.textContent = state.impact.isPerfect ? `IMPACT: ${pct}% • PURE` : `IMPACT: ${pct}%`;
}

function syncSwingUI(){
  SwingControls.syncFromState(state);
  const headPos = SwingControls.getTempoHeadPos();
  renderSwingTempo(Number.isFinite(headPos) ? headPos : (state.tempo?.headPos ?? 0));
  if(window.SwingPath){
    window.SwingPath.update({
      phase: state.phase,
      headPos01: Number.isFinite(headPos) ? headPos : 0,
      sweetCenter: state.alignment?.sweetCenter ?? 0,
      sweetWidthDeg: 18
    });
  }
  renderImpactReadout();
}

/**
 * Evaluate shot quality based on tempo, path, and attack angle
 * @param {number} tempo01 - Tempo head position (0..1)
 * @param {number} path01 - Path runner position (0..1)
 * @param {number} attackDeg - Attack angle in degrees
 * @returns {{ score01: number, components: { tempo: number, path: number, attack: number }}}
 */
function evalShot(tempo01, path01, attackDeg){
  const K = 6; // Falloff steepness
  
  // Tempo: sweet window from state
  const tempoStart = state.tempo?.windowStart ?? 0.6;
  const tempoEnd = state.tempo?.windowEnd ?? 0.8;
  const tempoCenter = (tempoStart + tempoEnd) / 2;
  const tempoHalfWidth = (tempoEnd - tempoStart) / 2 || 0.1;
  const tempoDist = Math.abs(tempo01 - tempoCenter) / tempoHalfWidth;
  const tempoComp = tempoDist <= 1 ? 1 : Math.exp(-K * (tempoDist - 1) * (tempoDist - 1));
  
  // Path: sweet center is 0.5 (middle of arc), window ~0.1 wide
  const pathCenter = 0.5;
  const pathHalfWidth = 0.15;
  const pathDist = Math.abs(path01 - pathCenter) / pathHalfWidth;
  const pathComp = pathDist <= 1 ? 1 : Math.exp(-K * (pathDist - 1) * (pathDist - 1));
  
  // Attack: sweet window from attackAngle state
  const attackCenter = (state.attackAngle?.windowMinDeg + state.attackAngle?.windowMaxDeg) / 2 || 1.5;
  const attackHalfWidth = ((state.attackAngle?.windowMaxDeg - state.attackAngle?.windowMinDeg) / 2) || 1.5;
  const attackDist = Math.abs(attackDeg - attackCenter) / attackHalfWidth;
  const attackComp = attackDist <= 1 ? 1 : Math.exp(-K * (attackDist - 1) * (attackDist - 1));
  
  // Weighted combination
  const score01 = clamp01(0.45 * tempoComp + 0.35 * pathComp + 0.20 * attackComp);
  
  return {
    score01,
    components: {
      tempo: clamp01(tempoComp),
      path: clamp01(pathComp),
      attack: clamp01(attackComp)
    }
  };
}

function genShotSetup(power = 0){
  const base = createShotSetup();
  const skill = clamp01(1 - (profile.handicapYd || state.handicap || 0) / 54);
  const windState = initWind(base.windSpeed, base.windDir);
  const w0 = sampleWind(windState, performance.now());
  const landing = computeLandingX({
    power,
    conditions: base.conditions,
    windFactor: w0.factor,
    windSpeed: w0.speed,
    windSigned: w0.signed,
    skill,
    fatigue: state.mental.data?.fatigue || 0,
    pressure: state.mental.data?.pressure || 0
  });
  return { ...base, ...landing, power: clamp01(power), skill, windState, initialWind: w0 };
}

function setStatusState(status){
  if(status) document.body.dataset.status = status;
}

function ensureAnim(){
  document.body.classList.add("gc-anim");
}

function setBallIdle(){
  flight.reset();
}

function setBallFly(){
  flight.startLive();
}

function genCrashX(){
  return clamp(genCrashForRisk(state.riskMode), 1.05, getRoundMaxX());
}

// == UI Rendering ==
function renderFlights(){
  if(!ui.lastFlights) return;
  ui.lastFlights.innerHTML = "";
  if(state.lastFlights.length === 0){
    const empty = document.createElement("div");
    empty.className = "gc-flightItem gc-muted";
    empty.textContent = "—";
    ui.lastFlights.appendChild(empty);
    return;
  }
  state.lastFlights.slice(0, 3).forEach(f => {
    const item = document.createElement("div");
    item.className = "gc-flightItem";
    const tag = f.perfect ? "PERFECT" : (f.crashed ? "CRASH" : "FLIGHT");
    const dist = f.distance ? fmtDistance(f.distance) : "0 yd";
    const evalLabel = f.targetEval ? ` · ${f.targetEval}` : "";
    item.textContent = `${tag} · ${dist} @ ${fmtX(f.x)}${evalLabel}`;
    ui.lastFlights.appendChild(item);
  });
}

function endRound(reason = "STOP", ts){
  if(state.phase === RoundPhase.END) return;
  const now = Number.isFinite(ts) ? ts : performance.now();
  const crashed = reason === "CRASH";
  state.phase = RoundPhase.END;
  setUiPhaseAttr(state.phase);
  state.timestamps.endMs = now;
  state.flags.crashed = crashed;
  state.running = false;

  const liveYd = state.liveDistanceYd ?? state.round.distanceLiveYards ?? 0;
  if(state.round?.sweetSpot && !state.round.sweetSpotFinal){
    state.round.sweetSpotFinal = { ...state.round.sweetSpot };
  }
  if(state.round?.sweetSpotFinal){
    state.perfectWindow = { start: state.round.sweetSpotFinal.minX, end: state.round.sweetSpotFinal.maxX };
  }
  state.round.state = crashed ? "CRASHED" : "ENDED";
  state.round.xLocked = state.currentX;
  state.round.landingX = state.currentX;
  const finalDistance = state.round.finalDistanceYards || Math.max(0, Math.round(liveYd));
  state.round.finalDistanceYards = finalDistance;
  state.lastDistanceYards = finalDistance;
  state.finalDistanceYd = finalDistance;
  state.targetEval = evaluateTarget(finalDistance, state.targetDistance).label;
  updateAnalytics(finalDistance, state.currentX);
  const perfect = isWithinPerfectWindow(state.currentX, state.perfectWindow);
  recordFlight({ distance: finalDistance, x: state.currentX, crashed: !!crashed, perfect });
  const highPowerAttempt = (state.power || 0) >= 0.9;
  if(highPowerAttempt){
    state.fatigue.streakHighPower += 1;
  }else{
    state.fatigue.streakHighPower = Math.max(0, state.fatigue.streakHighPower - 1);
  }
  state.fatigue.level = clamp01(state.fatigue.streakHighPower * 0.12);
  state.fatigue.lastRoundTs = now;
  updateModeUI();
  setDistanceUI(finalDistance);
  setButtons();
  setStatus(crashed ? "CRASHED" : "ENDED");
  setStatusState(crashed ? "crashed" : "locked");
  const frozenWind = state.round.windLast || state.round.windSnapshot;
  if(frozenWind){
    updateWindHUD(frozenWind);
    state._windFrozenOnce = true;
  }
  state.mental.data = applyRecoveryOnRoundEnd(state.mental.data);
  state.player.fatigue = clamp01(state.mental.data?.fatigue ?? state.player.fatigue ?? 0);
  if(crashed){
    flight.onCrash?.(state);
    if(flight.onCrashLand) flight.onCrashLand(finalDistance);
    else flight.crash(finalDistance);
  }else{
    flight.onCashout?.(state);
    flight.land(finalDistance);
  }
  state.lastResult = { yards: finalDistance, x: state.currentX };
  state.ui.canStart = true;
  setButtons();
  syncSwingUI();
  if(ui.perfectLabel){
    ui.perfectLabel.classList.remove("gc-sweetspot--breathing");
    ui.perfectLabel.classList.remove("gc-sweetspot--pulse");
  }
  state.impactUntilTs = 0;
  syncRendererState();
  console.log("[ROUND] end", { result: state.lastResult, crashed });
}

function formatHandicapDisplay(best3Avg){
  const val = computeHandicap(best3Avg);
  if(val == null) return "—";
  return val >= 0 ? `+${val}` : `${val}`;
}

function updateMinimalHUD({distanceYd, bestYd, memberName, handicap, best3Avg}){
  const setList = (ids, val) => {
    ids.forEach((id) => {
      const el = $(id);
      if(el) el.textContent = val;
    });
  };
  if(Number.isFinite(distanceYd)){
    setList(["uiDistanceYd"], Math.max(0, Math.round(distanceYd)));
    const hudDist = document.getElementById("hudDist");
    if(hudDist) hudDist.textContent = Math.max(0, Math.round(distanceYd));
  }
  if(Number.isFinite(bestYd)){
    setList(["uiBestYd"], Math.max(0, Math.round(bestYd)));
    const hudPB = document.getElementById("hudPB");
    if(hudPB) hudPB.textContent = Math.max(0, Math.round(bestYd));
  }
  if(memberName !== undefined){
    setList(["playerNameLabel", "playerName", "playerNameSide", "memberNameTop"], memberName || "Guest");
  }
  if(handicap !== undefined || best3Avg !== undefined){
    const display = (typeof handicap === "string")
      ? handicap
      : (best3Avg !== undefined ? formatHandicapDisplay(best3Avg) : (Number.isFinite(handicap) ? formatHandicapDisplay(handicap + 300) : "—"));
    setList(["handicapValue", "playerHcp", "playerHcpChip"], display);
  }
}

function renderStats(currentProfile = profile){
  const memberName = currentProfile?.name || state.playerName || "Guest";
  const pb = Number.isFinite(currentProfile?.pb) ? currentProfile.pb : 0;
  const best3 = Number.isFinite(currentProfile?.best3avg) ? currentProfile.best3avg : 0;
  const handicapDisplay = formatHandicapDisplay(best3);

  if(ui.nameLabel) ui.nameLabel.textContent = memberName || "Guest";
  if(ui.handicap) ui.handicap.textContent = handicapDisplay;
  if(ui.pbValue) ui.pbValue.textContent = Math.max(0, Math.round(pb));
  if(ui.best3AvgValue){
    const formatted = Math.round(best3 * 10) / 10;
    ui.best3AvgValue.textContent = formatted % 1 === 0 ? Math.round(formatted) : formatted.toFixed(1);
  }
  syncTopStats(currentProfile);
}

function syncTopStats(currentProfile = profile){
  const member = currentProfile?.name || state.playerName || "Guest";
  const pb = Number.isFinite(currentProfile?.pb) ? Math.max(0, Math.round(currentProfile.pb)) : Math.max(0, Math.round(state.bestDistance || 0));
  const best3 = Number.isFinite(currentProfile?.best3avg) ? currentProfile.best3avg : 0;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if(el && val != null) el.textContent = val;
  };

  set("memberNameTop", member);
  set("hudPB", pb);
  updateMinimalHUD({ best3Avg: best3 });
}

function updateShotInfo(){
  renderTopbar(state.shotSetup || {});
}

function updateWindHUD(setup){
  const windValueEl = document.getElementById("windValue");
  const windArrowEl = document.getElementById("windArrow");
  const hud = document.getElementById("windHUD");
  if(!windValueEl || !windArrowEl || !hud) return;
  const gusting = Math.abs(state.wind.gust || 0) > 0.08;
  windValueEl.textContent = `${state.wind.mph} mph`;
  windArrowEl.textContent = "▲";
  windArrowEl.style.transform = `rotate(${state.wind.dirDeg}deg)`;
  if(gusting) hud.classList.add("is-gust");
  else hud.classList.remove("is-gust");
}

function triggerMilestone(intX){
  if(state.round.state !== "RUNNING") return;
  const distEl = document.getElementById("hudDist")?.closest(".gc-flightHud__stat");
  const targets = [distEl, ui.coef];
  targets.forEach((node) => {
    if(!node) return;
    node.classList.remove("gc-milestone");
    void node.offsetWidth;
    node.classList.add("gc-milestone");
    setTimeout(() => node.classList.remove("gc-milestone"), 240);
  });
}

function updateStatusBadge(distance){
  const badge = document.getElementById("statusBadge");
  if(!badge) return;
  const distVal = Math.max(0, Math.round(distance || 0));
  const isRecord = distVal >= 500;
  const isZone = distVal >= 350;
  if(isRecord){
    badge.textContent = "500+ RECORD RANGE";
    badge.classList.remove("gc-hidden");
    badge.classList.add("gc-statusBadge--record");
  }else if(isZone){
    badge.textContent = "LONG DRIVE ZONE";
    badge.classList.remove("gc-hidden");
    badge.classList.remove("gc-statusBadge--record");
  }else{
    badge.classList.add("gc-hidden");
    badge.classList.remove("gc-statusBadge--record");
    badge.textContent = "";
  }
}

function updateModeUI(){
  if(ui.targetEvalLabel) ui.targetEvalLabel.textContent = state.targetEval || "—";
  if(ui.longestTodayLabel) ui.longestTodayLabel.textContent = `${Math.max(0, Math.round(state.longestToday.best || 0))} yd`;
}

function updateTargetLine(){
  if(ui.targetDistanceLabel) ui.targetDistanceLabel.textContent = state.targetDistance;
  if(!ui.targetLine) return;
  const pct = clamp(state.targetDistance / MAX_SCREEN_YARDS, 0, 1) * 100;
  ui.targetLine.style.left = `${pct}%`;
}

function setRiskMode(mode){
  state.riskMode = mode;
  state.growthRate = getGrowthForRisk(mode);
  ui.riskButtons?.forEach(btn => {
    btn.classList.toggle("gc-segmented__btn--active", btn.dataset.risk === mode);
  });
}

function getMaxForRisk(){
  return state.riskMode === "aggressive" ? 8.5 : 6.5;
}

function computeMaxXForQuality(quality){
  const base = getMaxForRisk();
  const tuned = base * lerp(0.85, 1.15, clamp01(quality));
  return clamp(tuned, 1.05, X_CAP);
}

function getRoundMaxX(){
  if(Number.isFinite(state.round?.maxX)){
    return clamp(state.round.maxX, 1.05, X_CAP);
  }
  const quality = Number.isFinite(state.round?.quality) ? state.round.quality : null;
  if(quality == null) return getMaxForRisk();
  return computeMaxXForQuality(quality);
}

function mapWindDirToDeg(dir){
  const d = (dir || "").toUpperCase();
  switch(d){
    case "N": return 0;
    case "NE": return 45;
    case "E": return 90;
    case "SE": return 135;
    case "S": return 180;
    case "SW": return 225;
    case "W": return 270;
    case "NW": return 315;
    default: return 90;
  }
}

function updatePlayerUI(){
  const best3Avg = Number.isFinite(profile.best3avg) ? profile.best3avg : 0;
  updateMinimalHUD({ memberName: state.playerName, handicap: profile.handicapYd || state.handicap, best3Avg });
  renderStats(profile);
}

function sendFlightHUD(){
  if(typeof window.setFlightHUD !== "function") return;
  const roundState = state.round?.state || "IDLE";
  const distance = getDistanceToShow();
  const tempoHead = SwingControls.getTempoHeadPos();
  const tempoPower = Number.isFinite(tempoHead) ? computeTempoPower(tempoHead) : (state.power ?? 0);
  const tempoPct = Math.max(0, Math.round((tempoPower || 0) * 100));
  const windMph = Math.round(state.wind.mph || 0);
  const windDirDeg = Math.round(state.wind.dirDeg || 0);
  window.setFlightHUD({
    distanceYd: distance,
    tempoPct,
    windMph,
    windDirDeg,
    roundState
  });
}

function syncRendererState(){
  const lastState = window.lastState || {};
  lastState.round = lastState.round || {};
  lastState.round.state = state.round?.state || "IDLE";
  lastState.round.flightProgress = state.round?.flightProgress || 0;
  lastState.currentX = state.currentX || 1;
  const effectiveDistance = state.round?.finalDistanceYards ?? state.liveDistanceYd ?? 0;
  lastState.distanceYd = effectiveDistance;
  lastState.effectiveDistanceYd = effectiveDistance;
  const faceNorm = Number.isFinite(state.round?.faceAngleNorm) ? state.round.faceAngleNorm : 0;
  const windFactor = clamp01((state.wind.mph || 0) / 18);
  const xFactor = clamp01((state.currentX - 1) / 4);
  const driftNorm = faceNorm * (0.55 + 0.45 * windFactor) * (0.65 + 0.35 * xFactor);
  lastState.round.bias = driftNorm;
  lastState.round.faceAngleNorm = faceNorm;
  lastState.round.faceAlignedAtRelease = !!state.round?.faceAlignedAtRelease;
  lastState.round.faceAlignedQuality01 = Number.isFinite(state.round?.faceAlignedQuality01) ? state.round.faceAlignedQuality01 : 0;
  lastState.round.danger = Number.isFinite(state.round?.danger) ? state.round.danger : 0;
  lastState.round.riskRate = Number.isFinite(state.round?.riskRate) ? state.round.riskRate : 0;
  window.lastState = lastState;
}

function setDistanceUI(distance){
  const displayDistance = Math.max(0, Math.round(getDistanceToShow()));
  const best = Math.max(profile.pb || 0, state.lastDistanceYards || 0, state.bestDistance || 0);
  const best3Avg = Number.isFinite(profile.best3avg) ? profile.best3avg : 0;
  const displayX = updateMultiplierState();
  if(ui.coef) ui.coef.textContent = fmtX(displayX);
  updateStatusBadge(displayDistance);
  updateMinimalHUD({
    distanceYd: displayDistance,
    bestYd: best,
    memberName: state.playerName,
    handicap: profile.handicapYd || state.handicap,
    best3Avg
  });
  const hudX = document.getElementById("hudX");
  if(hudX) hudX.textContent = fmtX(displayX);
  updateModeUI();
  sendFlightHUD();
}

function setButtons(){
  const disabled = state.round.state === "RUNNING" || state.ui?.canStart === false;
  if(ui.tempoControl){
    ui.tempoControl.classList.toggle("is-disabled", disabled);
    ui.tempoControl.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
  const btn = document.querySelector("#btnStart, #startBtn, .gc-start");
  if(btn) btn.disabled = !!disabled;
}

function recordFlight({distance, x, crashed, perfect}){
  const distRounded = Math.max(0, Math.round(distance));
  state.lastFlights.unshift({
    distance: distRounded,
    x: Number(x.toFixed(2)),
    crashed: !!crashed,
    perfect: !!perfect,
    targetEval: state.targetEval,
    ts: Date.now()
  });
  state.lastFlights = state.lastFlights.slice(0, 3);
  const currentBest = Math.max(profile.pb || 0, state.bestDistance || 0);
  const wasBest = !crashed && distRounded > currentBest;
  if(wasBest) state.bestDistance = distRounded;
  if(!crashed && distRounded > (state.longestToday.best || 0)){
    state.longestToday = saveLongestToday(distRounded);
  }
  recordAttempt(distRounded, crashed);
  renderFlights();
  saveToStorage();
  renderStats(profile);
  return { wasBest };
}

function updateAnalytics(finalDistance, finalX){
  const distance = Number(finalDistance) || 0;
  const sweetSpot = state.round?.sweetSpotFinal || state.round?.sweetSpot;
  const sweetHit = sweetSpot ? (finalX >= sweetSpot.minX && finalX <= sweetSpot.maxX) : false;
  const releasePct = Number.isFinite(state.power) ? clamp01(state.power) : null;
  analytics.recentDistances.push(distance);
  analytics.recentSweet.push(!!sweetHit);
  if(Number.isFinite(releasePct)) analytics.recentRelease.push(releasePct);
  analytics.recentDistances = analytics.recentDistances.slice(-ANALYTICS_MAX);
  analytics.recentSweet = analytics.recentSweet.slice(-ANALYTICS_MAX);
  analytics.recentRelease = analytics.recentRelease.slice(-ANALYTICS_MAX);
  saveAnalyticsState();
}

function beginHold(ts){
  console.log("[HOLD] beginHold fired", { ts, now: performance.now() });
  const now = Number.isFinite(ts) ? ts : performance.now();
  if(state.phase !== RoundPhase.IDLE && state.phase !== RoundPhase.END) return false;
  resetRound("beginHold");
  state.phase = RoundPhase.ARMING;
  setUiPhaseAttr(state.phase);
  state.timestamps = state.timestamps || {};
  state.timestamps.holdStartMs = Number.isFinite(ts) ? ts : performance.now();
  state.tempo = state.tempo || {};
  state.tempo.active = true;
  state.tempo.locked = false;
  state.tempo.lockedHeadPos = null;
  state.tempo.lockedX = null;
  SwingControls.beginHold(state.timestamps.holdStartMs, state);
  state.ui.canStart = false;
  state.tempo.holding = true;
  state.tempo.released = false;
  state.controls.tempoRelease = null;
  state.alignment = state.alignment || {};
  state.alignment.active = true;
  state.tempo.lockedAngleDeg = null;
  state.alignment.dir = 1;
  state.alignment.speedDeg = Number.isFinite(state.alignment.speedDeg) ? state.alignment.speedDeg : 90;
  state.alignment.hit = false;
  state.alignment.frozenValue = 0;
  state.round.faceAlignedAtRelease = false;
  state.round.faceAlignedQuality01 = 0;
  if(ui.alignmentRing) ui.alignmentRing.classList.remove("is-hit");
  initSweetSpot();
  state.round.windInitialized = false;
  initRoundWind(now);
  state.round.windInitialized = true;
  updateRoundWind(now);
  updateWindHUD();
  syncSwingUI();
  if(ui.perfectLabel){
    ui.perfectLabel.classList.add("gc-sweetspot--breathing");
    ui.perfectLabel.classList.remove("gc-sweetspot--pulse");
  }
  state._tempoUiTest = state._tempoUiTest || { enabled: true, startedAt: 0, lastV: null, stableCount: 0 };
  state._tempoUiTest.startedAt = state.timestamps.holdStartMs;
  state._tempoUiTest.stableCount = 0;
  state._tempoUiTest.lastV = null;
  setButtons();
  console.log("[HOLD] beginHold", { ts: state.timestamps.holdStartMs, phase: state.phase });
  return true;
}

function releaseSwing(ts, power = 0){
  const now = Number.isFinite(ts) ? ts : performance.now();
  if(state.phase !== RoundPhase.ARMING) return false;
  state.phase = RoundPhase.SWING;
  setUiPhaseAttr(state.phase);
  state.timestamps.releaseMs = now;
  SwingControls.releaseSwing(now, state);
  state.tempo.holding = false;
  state.tempo.released = true;
  updateImpactQuality();
  state.impact.locked = state.impact.live;
  const tempoRelease = SwingControls.getTempoHeadPos();
  const windowStart = Number.isFinite(state.tempo?.windowStart) ? state.tempo.windowStart : 0.6;
  const windowEnd = Number.isFinite(state.tempo?.windowEnd) ? state.tempo.windowEnd : 0.8;
  const tempoScore = scoreNeedleInWindow(tempoRelease, windowStart, windowEnd);
  state.round.tempoScore = tempoScore;
  const tempoHit = tempoScore > 0;
  const targetValue = 0.5;
  const windowWidth = clamp(state.alignment.sweetWidth / (Math.PI * 2), 0.03, 0.18);
  const half = windowWidth / 2;
  const alignValue = clamp(state.alignment.value || 0, 0, 1);
  const alignHit = Math.abs(alignValue - targetValue) <= half;
  state.alignment.hit = alignHit;
  state.alignment.frozenValue = alignValue;
  state.alignment.active = false;
  
  // LOCK ALL 3 WIDGETS
  SwingControls.lockTempo();
  SwingPath.lockPath();
  lockAttackAnglePlane();
  
  // Capture final values
  state.shot.tempo01 = SwingControls.getTempoHeadPos();
  state.shot.path01 = SwingPath.getPathPos01();
  state.shot.attackDeg = getAttackAngleValue();
  state.shot.locked = true;
  
  // Compute unified shot score
  const shotResult = evalShot(state.shot.tempo01, state.shot.path01, state.shot.attackDeg);
  state.shot.score01 = shotResult.score01;
  state.shot.components = shotResult.components;
  
  // Log shot data
  console.log("[SHOT]", {
    tempo01: state.shot.tempo01.toFixed(3),
    path01: state.shot.path01.toFixed(3),
    attackDeg: state.shot.attackDeg.toFixed(1),
    score01: state.shot.score01.toFixed(3),
    components: {
      tempo: state.shot.components.tempo.toFixed(2),
      path: state.shot.components.path.toFixed(2),
      attack: state.shot.components.attack.toFixed(2)
    }
  });
  
  // Update UI feedback using existing perfectWindowLabel
  if(ui.perfectLabel){
    const t = state.shot.components.tempo.toFixed(2);
    const p = state.shot.components.path.toFixed(2);
    const a = state.shot.components.attack.toFixed(2);
    ui.perfectLabel.textContent = `SHOT: T ${t} • P ${p} • A ${a}`;
  }
  
  state.controls.tempoRelease = tempoRelease;
  state.round.faceAngleNorm = 0;
  state.round.faceAlignedAtRelease = alignHit;
  state.round.faceAlignedQuality01 = alignHit ? 1 : 0;
  syncSwingUI();
  renderAttackAnglePlane();
  if(ui.alignmentRing){
    ui.alignmentRing.classList.toggle("is-hit", alignHit);
    if(alignHit){
      setTimeout(() => ui.alignmentRing?.classList.remove("is-hit"), 140);
    }
  }
  if(alignHit && ui.alignmentMarker){
    ui.alignmentMarker.classList.remove("is-pulse");
    void ui.alignmentMarker.getBBox();
    ui.alignmentMarker.classList.add("is-pulse");
    setTimeout(() => ui.alignmentMarker?.classList.remove("is-pulse"), 260);
  }
  const matchScore = computeMatchScore(tempoHit, alignHit);
  state.round.matchScore = matchScore;
  const quality = tempoHit && alignHit ? 1.12 : (tempoHit || alignHit ? 1.04 : 1.0);
  state.round.quality = quality;
  state.round.maxX = clamp(getMaxForRisk() * quality, 1.05, X_CAP);
  startRound(power, now);
  state.impactUntilTs = now + state.impactDelayMs;
  state.impactStartX = state.currentX;
  state.lastSwing.wasSweetSpot = (power || 0) >= 0.9;
  if(ui.perfectLabel){
    ui.perfectLabel.classList.remove("gc-sweetspot--breathing");
    if(state.lastSwing.wasSweetSpot){
      ui.perfectLabel.classList.add("gc-sweetspot--pulse");
      setTimeout(() => ui.perfectLabel?.classList.remove("gc-sweetspot--pulse"), 320);
    }
  }
  return true;
}

// == Round Loop ==

function tick(ts){
  const dtMs = state.lastTs ? (ts - state.lastTs) : 16;
  state._dbg = state._dbg || { t: 0 };
  if(!state._dbg.t || ts - state._dbg.t > 800){
    console.log("[TICK]", { phase: state.phase, ts, dtMs });
    state._dbg.t = ts;
  }
  const isHold = state.phase === RoundPhase.ARMING;
  const isRunning = state.phase === RoundPhase.SWING || state.phase === RoundPhase.FLIGHT;
  state.running = isRunning;
  SwingControls.update(ts, dtMs, state, { holdActive: isHold, running: isRunning });
  if(state.phase === RoundPhase.ARMING){
    state.lastTs = ts;
    updateRoundWind(ts);
    updateWindHUD();
    updateAttackAnglePlane(ts, dtMs);
    updateImpactQuality();
    
    // Live read all 3 widget values while not locked
    if(!state.shot.locked){
      state.shot.tempo01 = SwingControls.getTempoHeadPos();
      state.shot.path01 = SwingPath.getPathPos01();
      state.shot.attackDeg = getAttackAngleValue();
    }
    
    syncSwingUI();
    sendFlightHUD();
    syncRendererState();
    return;
  }
  if(!isRunning){
    state.lastTs = ts;
    sendFlightHUD();
    syncRendererState();
    return;
  }
  if(state.phase === RoundPhase.SWING){
    state.phase = RoundPhase.FLIGHT;
    setUiPhaseAttr(state.phase);
  }
  const dt = Math.max(0.001, dtMs / 1000);
  state.lastTs = ts;
  updateRoundWind(ts);
  updateWindHUD();
  state.env.wind = {
    mph: state.wind.mph,
    dirDeg: state.wind.dirDeg,
    gust: Math.abs(state.wind.gust * 20)
  };
  state.player.fatigue = clamp01(state.mental.data?.fatigue ?? state.player.fatigue ?? 0);
  updateStability(dt);
  updateSweetSpot(dt);
  syncSwingUI();
  if(state.impactUntilTs && ts < state.impactUntilTs){
    state.currentX = state.impactStartX || 1;
    state.round.flightProgress = 0;
    const liveYards = applyImpactToYards(yardsFromX(state.currentX));
    state.round.distanceLiveYards = liveYards;
    state.liveDistanceYd = liveYards;
    setDistanceUI(getDistanceToShow());
    flight.updateLive(state.round.distanceLiveYards);
    flight.render?.(state);
    syncRendererState();
    return;
  }
  const windSample = state.round.wind ? sampleWind(state.round.wind, ts) : null;
  const matchScale = Number.isFinite(state.round.matchScore) ? lerp(0.85, 1.1, state.round.matchScore) : 1;
  if(windSample){
    state.round.windLast = windSample;
    let windSlowdown = 1 - 0.22 * windSample.factor;
    windSlowdown += 0.06 * windSample.signed;
    windSlowdown = clamp(windSlowdown, 0.68, 1.03);
    const nextX = state.currentX + state.currentX * state.growthRate * matchScale * dt * windSlowdown;
    state.currentX = Math.min(X_CAP, Math.min(getRoundMaxX(), nextX));
    if(!state._lastWindHudAt || (ts - state._lastWindHudAt) > 120){
      updateWindHUD({ ...windSample, windDir: state.round.wind?.dir, dir: state.round.wind?.dir });
      state._lastWindHudAt = ts;
    }
  }else{
    const nextX = state.currentX + state.currentX * state.growthRate * matchScale * dt;
    state.currentX = Math.min(X_CAP, Math.min(getRoundMaxX(), nextX));
  }
  const prevInt = Math.floor(state.prevX || state.currentX);
  const curInt = Math.floor(state.currentX);
  if(state.round.state === "RUNNING" && curInt > prevInt){
    triggerMilestone(curInt);
  }
  state.prevX = state.currentX;

  const elapsed = ts - state.round.startTsMs;
  const p = Math.max(0, Math.min(1, elapsed / FLIGHT_MS_VISUAL));
  const liveYards = applyImpactToYards(yardsFromX(state.currentX));
  state.round.elapsedMs = elapsed;
  state.round.baseDistanceYardsLive = liveYards;
  state.round.distanceLiveYards = liveYards;
  state.liveDistanceYd = liveYards;
  state.round.flightProgress = p;
  setDistanceUI(getDistanceToShow());
  flight.updateLive(state.round.distanceLiveYards);
  flight.render?.(state);
  syncRendererState();

  const roundMax = getRoundMaxX();
  const landingTarget = Math.min(state.round.landingX || roundMax, roundMax);
  if(state.round?.state === "RUNNING"){
    const windN = clamp01((state.wind.mph || 0) / 20);
    const fatigueN = clamp01(state.mental.data?.fatigue ?? state.player.fatigue ?? 0);
    const stabilityN = computeSwingStability();
    const riskBase = RISK_K * Math.pow(Math.max(1, state.currentX), RISK_P);
    const env = 1 + windN * 0.8 + fatigueN * 0.6;
    const skill = 1.20 - stabilityN;
    let riskRate = clamp(riskBase * env * skill, 0, 0.65);
    riskRate = clamp(riskRate * impactRiskMultiplier(), 0, 0.65);
    const crashProb = 1 - Math.exp(-riskRate * dt);
    const dangerX = clamp01((state.currentX - DANGER_X_START) / (DANGER_X_FULL - DANGER_X_START));
    const danger = clamp01(dangerX * (1 + windN * 0.35 + fatigueN * 0.25) * (1.15 - stabilityN * 0.5));
    state.round.riskRate = riskRate;
    state.round.danger = danger;
    if(DBG_PHYS){
      state._physDbgAt = state._physDbgAt || 0;
      if(!state._physDbgAt || (ts - state._physDbgAt) > 1000){
        console.log("[PHYS]", { x: state.currentX, yards: yardsFromX(state.currentX), stabilityN, windN, fatigueN, riskRate, danger });
        state._physDbgAt = ts;
      }
    }
    if(Math.random() < crashProb){
      endRound("CRASH", ts);
      return;
    }
  }
  if(state.currentX >= landingTarget){
    state.currentX = landingTarget;
    endRound("STOP", ts);
    return;
  }
}

function startRound(power = 0, ts){
  console.log("[releaseSwing] ENTER dump=", window.DRIVIX_DUMP?.());
  const prevState = state.round?.state;
  if(state.round?.state === "RUNNING"){
    console.warn("[releaseSwing] BLOCKED reason=already_running", window.DRIVIX_DUMP?.());
    return;
  }
  if(!state.mental.data) state.mental.data = loadPlayerMental();
  state.ui.canStart = false;
  state.mental.data = applyAttemptMental({ power }, state.mental.data);
  state.player.fatigue = clamp01(state.mental.data?.fatigue ?? state.player.fatigue ?? 0);
  console.log("[ROUND] start", { prev: prevState, power });
  const shot = genShotSetup(power);
  state.shotSetup = shot;
  state.power = power;
  state.round.setup = shot;
  state.round.wind = shot.windState;
  state.round.windInitialized = true;
  state.round.longDriveUnlocked = Math.random() < LONG_DRIVE_UNLOCK_PROB;
  state.round.crashX = genCrashX();
  console.log("[releaseSwing] crashX=", state.round.crashX);
  state.currentX = 1.0;
  state.prevX = 1.0;
  state.round.sweetSpotFinal = null;
  state.env.wind = {
    mph: state.wind.mph,
    dirDeg: state.wind.dirDeg,
    gust: Math.abs(state.wind.gust * 20)
  };
  if(state.sweetSpot){
    state.round.sweetSpot = { minX: round2(state.sweetSpot.minX), maxX: round2(state.sweetSpot.maxX), centerX: state.sweetSpot.centerX, widthX: state.sweetSpot.widthX };
    state.perfectWindow = { start: state.sweetSpot.minX, end: state.sweetSpot.maxX };
  }
  state.targetEval = "—";
  state.lastTs = Number.isFinite(ts) ? ts : performance.now();
  state.running = true;
  state.round.state = "RUNNING";
  state.round.startTsMs = state.lastTs;
  state.round.landingX = shot.landingX;
  state.round.expectedX = shot.expectedX;
  state.round.windSnapshot = shot.initialWind || null;
  state.round.windLast = shot.initialWind || null;
  state.round.lockedX = null;
  state._windFrozenOnce = false;
  state._lastWindHudAt = 0;
  renderTopbar(shot);
  updateWindHUD(shot.initialWind || shot);
  resetMultiplier(state.round.startTsMs);
  state.finalDistanceYd = null;
  state.liveDistanceYd = 0;
  state.round.distanceLiveYards = 0;
  state.round.baseDistanceYardsLive = 0;
  state.round.finalDistanceYards = 0;
  state.round.xLocked = null;
  state.round.flightProgress = 0;
  state.lastDistanceYards = 0;
  updateShotInfo();
  setStatus("LIVE");
  setStatusState("flying");
    syncSwingUI();
  updateTargetLine();
  setBallFly();
  setButtons();
  flight.updateLive(state.round.distanceLiveYards);
  flight.onRoundStart?.(state);
  setDistanceUI(0);
  ensureMainLoop();
}

// == Modal / Player ==
function openModal(){
  if(!ui.modal) return;
  ui.modal.classList.remove("gc-hidden");
  ui.modal.classList.add("modal--open");
  ui.modal.style.display = "grid";
  ui.nameInput?.focus();
}

function closeModal(){
  if(!ui.modal) return;
  ui.modal.classList.add("gc-hidden");
  ui.modal.classList.remove("modal--open");
  ui.modal.style.display = "none";
}

function submitName(){
  const val = ui.nameInput?.value?.trim();
  if(val){
    state.playerName = val.slice(0, 32);
    persistProfile({ ...profile, name: state.playerName });
    updatePlayerUI();
    closeModal();
    return true;
  }
  ui.nameInput?.focus();
  return false;
}

function wireModal(){
  ui.enterBtn?.addEventListener("click", submitName);
  ui.skipBtn?.addEventListener("click", () => {
    state.playerName = "Guest";
    persistProfile({ ...profile, name: state.playerName });
    updatePlayerUI();
    closeModal();
  });
  ui.nameInput?.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      submitName();
    }
  });
  ui.modal?.addEventListener("click", (e) => {
    if(e.target?.dataset?.modalClose === "true"){
      closeModal();
    }
  });
}

function wireInfoTooltips(){
  const hideAll = () => document.querySelectorAll(".info-i.show").forEach(el => el.classList.remove("show"));
  document.addEventListener("click", (e) => {
    const target = e.target.closest?.(".info-i");
    if(target){
      const isOpen = target.classList.contains("show");
      hideAll();
      if(!isOpen){
        target.classList.add("show");
      }
      e.stopPropagation();
      return;
    }
    hideAll();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") hideAll();
  });
}

function wireGcInfoTooltips(){
  const triggers = Array.from(document.querySelectorAll(".gc-info, .info-i, .infoIcon, .hint-i"));
  if(triggers.length === 0) return;
  const tipEl = document.createElement("div");
  tipEl.className = "tooltip";
  tipEl.style.pointerEvents = "none";
  document.body.appendChild(tipEl);

  let showTimer = null;
  let activeEl = null;

  const hideTip = () => {
    if(showTimer) { clearTimeout(showTimer); showTimer = null; }
    tipEl.classList.remove("is-visible");
    tipEl.textContent = "";
  };

  const positionTip = (anchor) => {
    if(!anchor) return;
    const pad = 12;
    const gap = 10;
    const r = anchor.getBoundingClientRect();
    const tr = tipEl.getBoundingClientRect();
    let top = r.bottom + gap;
    let left = r.left + r.width * 0.1;
    if(top + tr.height > window.innerHeight - pad){
      top = r.top - gap - tr.height;
    }
    top = Math.max(pad, Math.min(top, window.innerHeight - tr.height - pad));
    left = Math.max(pad, Math.min(left, window.innerWidth - tr.width - pad));
    tipEl.style.top = `${Math.round(top)}px`;
    tipEl.style.left = `${Math.round(left)}px`;
  };

  const showTip = (el) => {
    const text = el.getAttribute("data-tooltip") || el.getAttribute("data-tip") || "";
    if(!text) return;
    if(showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      activeEl = el;
      tipEl.textContent = text;
      tipEl.classList.add("is-visible");
      positionTip(el);
    }, 180);
  };

  triggers.forEach(el => {
    el.addEventListener("mouseenter", () => showTip(el));
    el.addEventListener("focus", () => showTip(el));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("blur", hideTip);
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") hideTip();
  });
  document.addEventListener("mousedown", (e) => {
    if(activeEl && !tipEl.classList.contains("gc-hidden")){
      if(!tipEl.contains(e.target) && !activeEl.contains(e.target)){
        hideTip();
      }
    }
  }, true);
}

function setupMemberInlineEdit(){
  const nameEl = document.getElementById("memberNameTop") || document.getElementById("uiMemberName");
  const btn = document.getElementById("memberEditBtnTop") || document.getElementById("memberEditBtn");
  let pop = document.getElementById("memberPopover");
  const input = document.getElementById("memberPopoverInput");
  const saveBtn = document.getElementById("memberPopoverSave");
  const cancelBtn = document.getElementById("memberPopoverCancel");

  console.log("[MEMBER EDIT] initialized", { hasNameEl: !!nameEl, hasBtn: !!btn, hasPopover: !!pop });

  const storedName = (localStorage.getItem("drivix_member_name") || localStorage.getItem("drivix.playerName") || state.playerName || profile.name || "Guest").trim() || "Guest";
  state.playerName = storedName;
  profile = { ...profile, name: storedName };
  persistProfile(profile);
  if(nameEl) nameEl.textContent = storedName;

  const ensurePopover = () => {
    if(pop) return;
    const portal = document.getElementById("gc-popovers") || document.body;
    pop = document.createElement("div");
    pop.id = "memberPopover";
    pop.className = "gc-popover gc-hidden";
    pop.role = "dialog";
    pop.setAttribute("aria-modal", "true");
    pop.setAttribute("aria-label", "Edit member name");
    pop.innerHTML = `
      <div class="gc-popover__title">MEMBER</div>
      <div class="gc-popover__row">
        <input id="memberPopoverInput" type="text" maxlength="16" autocomplete="off" />
      </div>
      <div class="gc-popover__actions">
        <button id="memberPopoverCancel" class="gc-popover__btn" type="button">Cancel</button>
        <button id="memberPopoverSave" class="gc-popover__btn gc-popover__btn--primary" type="button">Save</button>
      </div>
    `;
    portal.appendChild(pop);
  };

  let popoverInput = input;
  let popoverSave = saveBtn;
  let popoverCancel = cancelBtn;
  let anchorRef = null;
  let outsideHandler = null;
  let keyHandler = null;
  let isOpen = false;
  let rafId = null;

  const positionPopover = (anchorEl, popEl) => {
    if(!anchorEl || !popEl) return;
    const pad = 12;
    const gap = 12;
    const r = anchorEl.getBoundingClientRect();

    popEl.style.visibility = "hidden";
    popEl.classList.remove("gc-hidden");

    requestAnimationFrame(() => {
      const pr = popEl.getBoundingClientRect();
      let top = r.bottom + gap;
      if(top + pr.height > window.innerHeight - pad){
        top = r.top - gap - pr.height;
      }
      top = Math.max(pad, Math.min(top, window.innerHeight - pr.height - pad));

      let left = r.left;
      left = Math.max(pad, Math.min(left, window.innerWidth - pr.width - pad));

      popEl.style.left = `${Math.round(left)}px`;
      popEl.style.top = `${Math.round(top)}px`;

      const anchorCenter = r.left + r.width / 2;
      const arrowLeft = Math.max(18, Math.min(pr.width - 28, anchorCenter - left));
      popEl.style.setProperty("--arrow-left", `${arrowLeft}px`);

      const isAbove = (top + pr.height) <= r.top;
      popEl.setAttribute("data-pos", isAbove ? "top" : "bottom");

      popEl.style.visibility = "visible";
      const inp = popEl.querySelector("input");
      if(inp){
        inp.focus({ preventScroll: true });
        inp.select();
      }
    });
  };

  const openPopover = (anchor) => {
    ensurePopover();
    popoverInput = document.getElementById("memberPopoverInput");
    popoverSave = document.getElementById("memberPopoverSave");
    popoverCancel = document.getElementById("memberPopoverCancel");
    if(pop && pop.parentNode !== document.body){
      document.body.appendChild(pop);
    }
    anchorRef = anchor || nameEl || btn;
    if(!popoverInput || !pop) return;
    pop.classList.remove("gc-hidden");
    pop.style.display = "block";
    pop.style.visibility = "visible";
    pop.addEventListener("mousedown", (e) => e.stopPropagation());
    pop.addEventListener("click", (e) => e.stopPropagation());
    popoverInput.value = (state.playerName || "Guest").slice(0, 16);
    positionPopover(anchorRef, pop);
    isOpen = true;

    outsideHandler = (e) => {
      if(!pop || pop.classList.contains("gc-hidden")) return;
      if(pop.contains(e.target) || anchorRef?.contains(e.target)) return;
      closePopover();
    };
    keyHandler = (e) => {
      if(e.key === "Escape") closePopover();
      if(e.key === "Enter" && document.activeElement === popoverInput){
        e.preventDefault();
        applyName();
      }
    };
    document.addEventListener("mousedown", outsideHandler, true);
    document.addEventListener("keydown", keyHandler, true);
    window.addEventListener("resize", repositionIfOpen);
    window.addEventListener("scroll", repositionIfOpen, true);
  };

  const closePopover = () => {
    if(pop){
      pop.classList.add("gc-hidden");
      pop.style.display = "";
      pop.style.visibility = "";
    }
    isOpen = false;
    anchorRef = null;
    document.removeEventListener("mousedown", outsideHandler, true);
    document.removeEventListener("keydown", keyHandler, true);
    window.removeEventListener("resize", repositionIfOpen);
    window.removeEventListener("scroll", repositionIfOpen, true);
  };

  const repositionIfOpen = () => {
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if(isOpen && pop && anchorRef){
        positionPopover(anchorRef, pop);
      }
      rafId = null;
    });
  };

  const applyName = () => {
    const field = popoverInput || input;
    if(!field) return;
    const next = (field.value || "").trim().slice(0, 16) || "Guest";
    if(next === "Guest"){
      try{ localStorage.removeItem("drivix_member_name"); }catch(_){}
    }else{
      localStorage.setItem("drivix_member_name", next);
    }
    state.playerName = next;
    profile = { ...profile, name: next };
    persistProfile(profile);
    if(nameEl) nameEl.textContent = next;
    updatePlayerUI();
    closePopover();
  };

  const handleTrigger = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const isOpen = pop && !pop.classList.contains("gc-hidden");
    if(isOpen && anchorRef && (anchorRef === (e.currentTarget || null))){
      closePopover();
    }else{
      openPopover(e.currentTarget || anchorRef || nameEl || btn);
    }
  };
  nameEl?.addEventListener("click", handleTrigger);
  nameEl?.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      handleTrigger(e);
    }
  });
  btn?.addEventListener("click", handleTrigger);

  popoverSave?.addEventListener("click", applyName);
  popoverCancel?.addEventListener("click", closePopover);
}

function resetPlayer(){
  state.phase = RoundPhase.IDLE;
  setUiPhaseAttr(state.phase);
  state.timestamps.holdStartMs = 0;
  state.timestamps.releaseMs = 0;
  state.timestamps.endMs = 0;
  state.flags.crashed = false;
  state.playerName = "Guest";
  state.handicap = 0;
  state.bestDistance = 0;
  state.lastDistanceYards = 0;
  state.liveDistanceYd = 0;
  state.finalDistanceYd = null;
  state.round.distanceLiveYards = 0;
  state.round.state = "IDLE";
  state.round.startTsMs = 0;
  state.round.elapsedMs = 0;
  state.round.baseCarryPotentialYards = 0;
  state.round.baseDistanceYardsLive = 0;
  state.round.finalDistanceYards = 0;
  state.round.xLocked = null;
  state.round.distanceLiveYards = 0;
  state.round.flightProgress = 0;
  state.round.landingX = 0;
  state.round.expectedX = 0;
  state.round.setup = null;
  state.round.wind = null;
  state.round.windSnapshot = null;
  state.round.windLast = null;
  state.round.windInitialized = false;
  state.round.sweetSpot = null;
  state.round.sweetSpotFinal = null;
  state.round.longDriveUnlocked = false;
  state.round.quality = null;
  state.round.maxX = null;
  state.round.matchScore = null;
  state.round.faceAngleNorm = 0;
  state.round.bias = 0;
  state.lastFlights = [];
  state.perfectWindow = null;
  state.stability = 0;
  state.sweetSpot = {
    baseCenterX: 2.7,
    baseWidthX: 0.55,
    centerX: 2.7,
    widthX: 0.55,
    minX: 2.42,
    maxX: 2.98
  };
  state.player.fatigue = 0;
  state.fatigue.level = 0;
  state.fatigue.streakHighPower = 0;
  state.fatigue.lastRoundTs = 0;
  state.alignment.value = 0;
  state.alignment.dir = 1;
  state.alignment.speed = 0;
  state.alignment.speedDeg = 0;
  state.alignment.active = false;
  state.alignment.sweetCenter = 0;
  state.alignment.hit = false;
  state.alignment.frozenValue = 0;
  state.wind.baseDirRad = 0;
  state.wind.baseStrength = 0;
  state.wind.gust = 0;
  state.wind.dirJitter = 0;
  state.wind.seed = 0;
  state.wind.mph = 0;
  state.wind.dirDeg = 0;
  state.wind.targetGust = 0;
  state.wind.targetDirJitter = 0;
  state.wind.nextTargetAt = 0;
  state.targetEval = "—";
  state.shotSetup = null;
  state.prevX = 1;
  state.controls.tempoRelease = null;
  analytics.recentDistances = [];
  analytics.recentSweet = [];
  analytics.recentRelease = [];
  resetMultiplier(null);
  profile = { ...defaultProfile, name: "Guest" };
  syncStateWithProfile();
  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("drivix.playerName");
    localStorage.removeItem("drivix.profileJson");
    localStorage.removeItem("drivix.stats");
  }catch(err){
    console.warn("[LD] reset failed", err);
  }
  saveToStorage();
  renderFlights();
  updatePlayerUI();
  setDistanceUI(0);
  updateShotInfo();
  flight.reset();
  setStatus("READY");
  setStatusState("ready");
  setBallIdle();
  updateModeUI();
  syncSwingUI();
}

function initUI(){
  ensureAnim();
  SwingControls.init(state);
  window.SwingPath?.init?.();
  setStatus("READY");
  setStatusState("ready");
  setBallIdle();
  setDistanceUI(0);
  flight.reset();
  renderFlights();
  updatePlayerUI();
  updateModeUI();
  updateTargetLine();
  syncSwingUI();
  initAttackAnglePlane(() => state, { isArming: (s) => s.phase === RoundPhase.ARMING });
  renderAttackAnglePlane();
  resetSwingTempoMeter();
  setButtons();
  updateShotInfo();
  ensureImpactReadout();

  bindSwingTempoInput();
  wireModal();
  wireInfoTooltips();
  wireGcInfoTooltips();
  ensureMainLoop();
  setupMemberInlineEdit();
  ui.changePlayer?.addEventListener("click", openModal);
  ui.resetPlayer?.addEventListener("click", resetPlayer);
  ui.riskButtons?.forEach(btn => {
    btn.addEventListener("click", () => {
      const risk = btn.dataset.risk === "aggressive" ? "aggressive" : "calm";
      setRiskMode(risk);
    });
  });
  setRiskMode(state.riskMode);

  if(!state.playerName){
    openModal();
  }

  state.mental.data = loadPlayerMental();
  updateWindHUD(state.shotSetup || { windSpeed: 0, windDir: "E", dir: "E" });
  window.__drivixState = state;
}

function bindSwingTempoInput(){
  const control = ui.tempoControl;
  const head = ui.tempoHead;
  const windowEl = ui.tempoWindow;
  if(!control || !head || !windowEl) return;

  const beginTempo = (e) => {
    if(state.phase !== RoundPhase.IDLE && state.phase !== RoundPhase.END) return;
    if(e?.button !== undefined && e.button !== 0) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try{ control.setPointerCapture?.(e.pointerId); }catch(_){}
    if(!beginHold(performance.now())) return;
  };

  const launchSwing = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const headPos = SwingControls.getTempoHeadPos();
    const power = computeTempoPower(headPos);
    releaseSwing(performance.now(), power);
  };

  control.addEventListener("pointerdown", beginTempo, { passive: false });
  control.addEventListener("pointerup", launchSwing, { passive: false });
  control.addEventListener("pointercancel", launchSwing, { passive: false });
  control.addEventListener("keydown", (e) => {
    if(e.repeat) return;
    if(e.key === " " || e.key === "Enter"){
      e.preventDefault();
      beginTempo(e);
    }
  });
  control.addEventListener("keyup", (e) => {
    if(e.key === " " || e.key === "Enter"){
      e.preventDefault();
      launchSwing(e);
    }
  });

}

const flight = {
  engine: null,
  startLive: () => flight.engine?.onRoundStart?.(state),
  updateLive: (_yards) => {},
  land: (_yards) => flight.engine?.onCashout?.(state),
  crash: (_yards) => flight.engine?.onCrash?.(state),
  onCrashLand: (_yards) => flight.engine?.onCrash?.(state),
  onRoundStart: (gs) => flight.engine?.onRoundStart?.(gs),
  onCashout: (gs) => flight.engine?.onCashout?.(gs),
  onCrash: (gs) => flight.engine?.onCrash?.(gs),
  render: (gs) => flight.engine?.render?.(gs),
  reset: () => flight.engine?.destroy?.()
};

window.addEventListener("DOMContentLoaded", () => {
  console.log("APP INIT OK");
  document.documentElement.setAttribute("data-theme", "night");
  hydrateProfile();
  loadAnalyticsState();
  renderStats(profile);
  loadFromStorage();
  try{
    const canvas = document.getElementById("flight3dCanvas");
    flight.engine = window.initFlightAviatorLike ? window.initFlightAviatorLike(canvas, {}) : null;
    if(!flight.engine){
      console.error("[LD] Aviator renderer missing");
    }
  }catch(err){
    console.error("[LD] renderer init failed", err);
  }
  initUI();

  const bestSrc = document.querySelector("#uiBestYd, #bestValue, #bestDistance, [data-best-distance]");
  const youBest = document.querySelector("#youBestInline");
  if(bestSrc && youBest){
    youBest.textContent = bestSrc.textContent?.trim() || "—";
  }
});

window.DRIVIX_DUMP = function(){
  try{
    const s = window.state || state;
    return {
      round: s?.round,
      currentX: s?.currentX,
      crashX: s?.round?.crashX ?? s?.crashX,
      canStart: s?.ui?.canStart,
      startDisabled: document.querySelector("#btnStart, #startBtn, .gc-start")?.disabled,
      flags: {
        crashActive: s?.crash?.active,
        exitActive: s?.exit?.active,
        tempoHolding: s?.tempo?.holding,
        tempoReleased: s?.tempo?.released
      }
    };
  }catch(e){
    return { error: String(e) };
  }
};
