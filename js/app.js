// Long Drive — Crash-style single swing
// Feature checklist:
// - Perfect Window + Signature Moment overlay (perfect strike or new best)
// - Longest Today (per-day best) with localStorage reset
// - Target line evaluation (ON LINE / SHORT / LONG) at 300 yd
// - Risk selector (Calm/Aggressive) influencing crash window
// UI/game state focused on distance and cashout timing

// == Config / Constants ==
import { isWithinPerfectWindow, loadLongestToday, saveLongestToday, evaluateTarget, genCrashForRisk, getGrowthForRisk, showSignatureOverlay } from "./longdrive-extras.js";
import { clamp, clamp01 } from "./logic/rng.js";
import { createShotSetup } from "./logic/shot_setup.js";
import { computeLandingX } from "./logic/risk_engine.js";
import { renderTopbar } from "./ui/topbar.js";
import { loadPlayerMental, applyAttemptMental, applyRecoveryOnRoundEnd } from "./logic/player_state.js";
import { initWind, sampleWind } from "./logic/wind.js";

const FLIGHT_MS_VISUAL = 2200;
const STORAGE_KEY = "golfcentral.longdrive.v1";
const BASE_CARRY = 220; // yards at 1.00x
const CARRY_PER_X = 55; // yards gained per +1x
const MAX_SCREEN_YARDS = 300;
const TARGET_DISTANCE = 300;
const MAX_YD = 500;
const LONG_DRIVE_UNLOCK_PROB = 0.12;
const X_CAP = 9.99;

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
  tempoHead: $("swingTempoHead"),
  tempoWindow: $("swingTempoWindow"),
  swingWind: $("swingWind"),
  swingWindArrow: $("swingWindArrow"),
  swingWindValue: $("swingWindValue"),
  alignmentRing: $("alignmentRing"),
  alignmentBase: $("alignmentBase"),
  alignmentSweet: $("alignmentSweet"),
  alignmentMarker: $("alignmentMarker"),
  alignmentRunner: $("alignmentRunner"),
  status: $("roundStatus", "status"),
  coef: $("coef"),
  lastFlights: $("lastFlightsList"),
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
  const val = Math.round((Number(x) || 0) * 100);
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


function computeSweetSpot(currentX, wind, fatigue, mode){
  const x = Math.max(1, Number(currentX) || 1);
  const windMph = Math.max(0, Number(wind?.mph) || 0);
  const gust = Math.max(0, Number(wind?.gust) || 0);
  const baseWidth = clamp(x * 0.15, 0.22, 0.65);
  const windEffect = clamp01((windMph + gust * 0.6) / 18);
  const fatigueEffect = clamp01(fatigue);
  const d = clamp01(0.55 * windEffect + 0.45 * fatigueEffect);
  const center = x - lerp(0.00, 0.18, d);
  const width = baseWidth * lerp(1.00, 0.72, d) * (1 - fatigueEffect * 0.25);
  let minX = center - width / 2;
  let maxX = center + width / 2;
  minX = Math.max(1.05, minX);
  maxX = Math.min(9.99, maxX);
  if(maxX - minX < 0.08){
    const mid = (minX + maxX) / 2;
    minX = mid - 0.04;
    maxX = mid + 0.04;
    if(minX < 1.05){
      minX = 1.05;
      maxX = 1.13;
    }
    if(maxX > 9.99){
      maxX = 9.99;
      minX = 9.91;
    }
  }
  return { minX: round2(minX), maxX: round2(maxX) };
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

function polarToCartesian(cx, cy, r, angleRad){
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad)
  };
}

function degToRad(deg){
  return deg * Math.PI / 180;
}

const ALIGN_RING = {
  cx: 60,
  cy: 60,
  r: 46,
  gapRad: (Math.PI / 180) * 20
};

function describeArc(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function updateAlignmentRingUI(value, sweetCenter, sweetWidth){
  if(!ui.alignmentRing || !ui.alignmentSweet || !ui.alignmentRunner) return;
  const { cx, cy, r, gapRad } = ALIGN_RING;
  const arcStart = gapRad / 2;
  const arcEnd = Math.PI * 2 - gapRad / 2;
  if(ui.alignmentBase){
    ui.alignmentBase.setAttribute("d", describeArc(cx, cy, r, arcStart, arcEnd));
  }
  const targetAngle = Math.PI;
  const centerAngle = targetAngle + (sweetCenter || 0);
  const sweetHalf = sweetWidth / 2;
  const sweetStart = clamp(centerAngle - sweetHalf, arcStart, arcEnd);
  const sweetEnd = clamp(centerAngle + sweetHalf, arcStart, arcEnd);
  ui.alignmentSweet.setAttribute("d", describeArc(cx, cy, r, sweetStart, sweetEnd));
  const angleDeg = state.tempo.lockedAngleDeg ?? state.tempo.angleDeg ?? 0;
  const runnerAngleRad = degToRad(angleDeg);
  const pos = { x: cx + r * Math.cos(runnerAngleRad), y: cy + r * Math.sin(runnerAngleRad) };
  ui.alignmentRunner.setAttribute("cx", pos.x.toFixed(2));
  ui.alignmentRunner.setAttribute("cy", pos.y.toFixed(2));
}

function initAlignmentRing(){
  const motionStart = TEMPO_ARC.motionStart;
  const motionEnd = TEMPO_ARC.motionEnd;
  const minA = Math.min(motionStart, motionEnd);
  const maxA = Math.max(motionStart, motionEnd);
  const angleDeg = Number.isFinite(state.tempo?.angleDeg) ? state.tempo.angleDeg : motionStart;
  state.tempo.angleDeg = angleDeg;
  state.alignment.value = clamp01((angleDeg - minA) / Math.max(0.001, maxA - minA));
  state.alignment.dir = Number.isFinite(state.alignment.dir) ? state.alignment.dir : 1;
  state.alignment.speedDeg = Number.isFinite(state.alignment.speedDeg) ? state.alignment.speedDeg : 90;
  state.alignment.active = true;
  state.alignment.frozenValue = 0;
  state.alignment.hit = false;
  state.alignment.sweetCenter = 0;
  updateAlignmentRingUI(state.alignment.value, state.alignment.sweetCenter, state.alignment.sweetWidth);
  if(ui.alignmentRing) ui.alignmentRing.classList.remove("is-hit");
}

function updateAlignmentRing(ts, dtMs){
  if(!state.alignment.active) return;
  const dt = Math.max(0.001, (dtMs || 16) / 1000);
  const motionStart = TEMPO_ARC.motionStart;
  const motionEnd = TEMPO_ARC.motionEnd;
  const minA = Math.min(motionStart, motionEnd);
  const maxA = Math.max(motionStart, motionEnd);
  let angle = Number.isFinite(state.tempo?.angleDeg) ? state.tempo.angleDeg : motionStart;
  let dir = Number.isFinite(state.alignment.dir) ? state.alignment.dir : 1;
  const speedDeg = Number.isFinite(state.alignment.speedDeg) ? state.alignment.speedDeg : 90;

  angle += speedDeg * dir * dt;
  if(angle >= maxA){
    angle = maxA;
    dir = -1;
  }else if(angle <= minA){
    angle = minA;
    dir = 1;
  }

  state.tempo.angleDeg = angle;
  state.alignment.dir = dir;
  state.alignment.value = clamp01((angle - minA) / Math.max(0.001, maxA - minA));

  updateAlignmentRingUI(state.alignment.value, state.alignment.sweetCenter, state.alignment.sweetWidth);
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
  state.tempo.angleDeg = 0;
  state.tempo.lockedAngleDeg = null;
  state.ui = state.ui || {};
  state.ui.canStart = true;
  if(typeof SwingTempo !== "undefined" && SwingTempo.resetRound){
    SwingTempo.resetRound();
  }
  setButtons();
}

function resetRound(reason = "manual"){
  resetRoundState(reason);
  state.phase = RoundPhase.IDLE;
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
  initSweetSpot();
  if(ui.perfectLabel){
    ui.perfectLabel.classList.remove("gc-sweetspot--breathing");
    ui.perfectLabel.classList.remove("gc-sweetspot--pulse");
  }
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

function computeEfficiency(xLocked, crashed){
  const x = Math.max(1, xLocked || 1);
  const effBase = 0.92 + 0.18 * (1 - Math.exp(-0.9 * (x - 1)));
  return crashed ? effBase * 0.78 : effBase;
}

function scoreNeedleInWindow(pos, start, end){
  const span = Math.max(0.001, end - start);
  const center = start + span / 2;
  const dist = Math.abs(pos - center);
  const score = 1 - dist / (span / 2);
  return clamp01(score);
}

const SwingTempo = (() => {
  const cfg = {
    loopMs: 1800,
    minPower: 0.55,
    maxPower: 1.05,
    inertia: {
      stiffness: 28,
      damping: 0.82,
      maxVel: 3.5
    },
    fatigue: {
      decayPerSec: 0.03,
      boost: 0.35,
      bumpHi: 0.12,
      threshold: 0.92,
      idleResetSec: 10
    },
    wind: {
      shiftMax: 0.1,
      driftMin: 2000,
      driftMax: 4000,
      gustChance: 0.2,
      gustAmp: 0.6,
      gustDuration: 1400
    }
  };

  const els = {
    control: null,
    head: null,
    window: null,
    windArrow: null,
    windValue: null
  };

  const state = {
    initialized: false,
    holding: false,
    startMs: 0,
    targetPos: 0,
    headPos: 0,
    headVel: 0,
    winBase: { start: 0.6, end: 0.8 },
    winShifted: { start: 0.6, end: 0.8 },
    lastReleasePos: 0,
    lastReleaseScore: 0,
    externalWindow: false,
    fatigue: 0,
    lastReleaseMs: 0,
    roundActive: false,
    wind: { dir: 0, strength: 0, gusting: false },
    windTimers: { nextDrift: 0, gustEnds: 0 },
    windBaseStrength: 0.2
  };

  const clamp01Safe = (v) => clamp01(Number.isFinite(v) ? v : 0);
  const easeInOutCubic = (t) => {
    const x = clamp01Safe(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const randRange = (min, max) => min + Math.random() * (max - min);

  function setWindowVisual(start01, end01){
    if(!els.window) return;
    const span = Math.max(0.02, end01 - start01);
    els.window.style.left = `${start01 * 100}%`;
    els.window.style.width = `${span * 100}%`;
  }

  function updateHeadVisual(){
    if(!els.head) return;
    els.head.style.left = `${clamp01Safe(state.headPos) * 100}%`;
  }

  function getWindShift(){
    if(!FEATURES.wind) return 0;
    if(state.externalWindow) return 0;
    return clamp(state.wind.dir * state.wind.strength * cfg.wind.shiftMax, -0.4, 0.4);
  }

  function refreshWindow(){
    const span = Math.max(0.02, state.winBase.end - state.winBase.start);
    let center = state.winBase.start + span / 2 + getWindShift();
    const bounds = { min: span / 2, max: 1 - span / 2 };
    center = clamp(center, bounds.min, bounds.max);
    state.winShifted.start = clamp01Safe(center - span / 2);
    state.winShifted.end = clamp01Safe(center + span / 2);
    setWindowVisual(state.winShifted.start, state.winShifted.end);
  }

  function setWindow(start01, end01){
    state.winBase = {
      start: clamp01Safe(start01),
      end: clamp01Safe(end01)
    };
    state.externalWindow = true;
    refreshWindow();
  }

  function applyFatigueDecay(dtSec, now){
    if(!FEATURES.fatigue) return;
    state.fatigue = clamp01Safe(state.fatigue - cfg.fatigue.decayPerSec * dtSec);
    if(!state.holding && state.lastReleaseMs && (now - state.lastReleaseMs) > cfg.fatigue.idleResetSec * 1000){
      state.fatigue = 0;
    }
  }

  function maybeUpdateWind(now){
    if(!FEATURES.wind || !els.window) return;
    if(!state.windTimers.nextDrift) state.windTimers.nextDrift = now + randRange(cfg.wind.driftMin, cfg.wind.driftMax);
    if(now >= state.windTimers.nextDrift){
      state.wind.dir = clamp(randRange(-1, 1), -1, 1);
      state.windBaseStrength = clamp(randRange(0.15, 0.7), 0, 1);
      state.windTimers.nextDrift = now + randRange(cfg.wind.driftMin, cfg.wind.driftMax);
      if(Math.random() < cfg.wind.gustChance){
        state.wind.gusting = true;
        state.windTimers.gustEnds = now + cfg.wind.gustDuration;
      }
    }
    if(state.wind.gusting){
      const t = clamp01Safe(1 - (state.windTimers.gustEnds - now) / cfg.wind.gustDuration);
      if(t >= 1){
        state.wind.gusting = false;
      }
      const gustFactor = Math.sin(t * Math.PI);
      state.wind.strength = clamp01Safe(state.windBaseStrength * (1 + cfg.wind.gustAmp * gustFactor));
    }else{
      state.wind.strength = state.windBaseStrength;
    }
    refreshWindow();
    updateWindDisplay();
  }

  function updateWindDisplay(){
    if(!els.windValue || !els.windArrow) return;
    const dirArrow = state.wind.dir >= 0 ? "→" : "←";
    els.windArrow.textContent = dirArrow;
    const pct = Math.round(state.wind.strength * 100);
    els.windValue.textContent = `${pct}%`;
  }

  function applyInertia(dtSec){
    if(!FEATURES.tempoInertia){
      state.headPos = state.targetPos;
      updateHeadVisual();
      return;
    }
    const stiffness = cfg.inertia.stiffness * dtSec;
    state.headVel += (state.targetPos - state.headPos) * stiffness;
    state.headVel = clamp(state.headVel, -cfg.inertia.maxVel, cfg.inertia.maxVel);
    const dampingFactor = Math.pow(cfg.inertia.damping, dtSec * 60);
    state.headVel *= dampingFactor;
    state.headPos = clamp01Safe(state.headPos + state.headVel * dtSec);
    updateHeadVisual();
  }

  function computeProgress(now){
    const elapsed = Math.max(0, now - state.startMs);
    const fatigueBoost = FEATURES.fatigue ? (1 + state.fatigue * cfg.fatigue.boost) : 1;
    const globalFatigue = (typeof window !== "undefined" && window.__drivixState?.fatigue?.level) ? window.__drivixState.fatigue.level : 0;
    const tempoBoost = 1 + globalFatigue * 0.15;
    const speedMs = cfg.loopMs / (fatigueBoost * tempoBoost);
    const p = ((elapsed % speedMs) / speedMs);
    const eased = easeInOutCubic(p);
    const risky = eased + 0.16 * p * p;
    return clamp01Safe(risky);
  }

  function computePower(){
    const center = (state.winShifted.start + state.winShifted.end) / 2;
    const halfSpan = Math.max(0.001, (state.winShifted.end - state.winShifted.start) / 2);
    const dist = Math.abs(state.headPos - center);
    const accuracy = clamp01Safe(1 - dist / halfSpan);
    const weighted = Math.pow(accuracy, 1.1);
    const power = cfg.minPower + weighted * (cfg.maxPower - cfg.minPower);
    return clamp(power, cfg.minPower, cfg.maxPower);
  }

  function getScore(){
    return scoreNeedleInWindow(state.headPos, state.winShifted.start, state.winShifted.end);
  }

  function setActiveClass(active){
    if(!els.control) return;
    els.control.classList.toggle("gc-tempo--active", active && FEATURES.windowBreath);
  }

  function update(dtMs, opts = {}){
    if(!state.initialized) return;
    const now = performance.now();
    const dtSec = Math.max(0.001, (dtMs || 0) / 1000);
    applyFatigueDecay(dtSec, now);
    maybeUpdateWind(now);
    const shouldBeActive = state.holding || !!opts.roundActive;
    setActiveClass(shouldBeActive);
    if(state.holding){
      state.targetPos = computeProgress(now);
    }
    applyInertia(dtSec);
  }

  function startHold(){
    if(!state.initialized) return false;
    state.holding = true;
    state.startMs = performance.now();
    state.targetPos = 0;
    state.headVel = 0;
    setActiveClass(true);
    return true;
  }

  function endHold(){
    if(!state.holding) return null;
    state.lastReleasePos = state.headPos;
    state.lastReleaseScore = scoreNeedleInWindow(state.lastReleasePos, state.winShifted.start, state.winShifted.end);
    const power = computePower();
    state.holding = false;
    state.lastReleaseMs = performance.now();
    if(FEATURES.fatigue && power >= cfg.fatigue.threshold){
      const gain = cfg.fatigue.bumpHi * clamp01Safe((power - cfg.fatigue.threshold) / (cfg.maxPower - cfg.fatigue.threshold));
      state.fatigue = clamp01Safe(state.fatigue + gain);
    }
    setActiveClass(false);
    return power;
  }

  function resetRound(){
    state.holding = false;
    state.headVel = 0;
    state.targetPos = 0;
    state.externalWindow = false;
    setActiveClass(false);
    updateHeadVisual();
  }

  function setWind(input){
    if(!FEATURES.wind || !input) return;
    const dir = typeof input.dir === "string" ? input.dir : input.windDir || input.direction;
    const strengthRaw = input.strength ?? input.speed ?? input.windSpeed ?? 0;
    const dirSign = typeof dir === "string" && dir.toUpperCase().includes("W") ? -1 : 1;
    state.wind.dir = clamp(dirSign, -1, 1);
    state.windBaseStrength = clamp01Safe(Math.abs(strengthRaw) / 10 || 0.2);
    state.windTimers.nextDrift = performance.now() + randRange(cfg.wind.driftMin, cfg.wind.driftMax);
    refreshWindow();
    updateWindDisplay();
  }

  function getWind(){
    return { ...state.wind };
  }

  function isHolding(){
    return !!state.holding;
  }

  function init({ control, head, windowEl, windArrow, windValue }){
    els.control = control || null;
    els.head = head || null;
    els.window = windowEl || null;
    els.windArrow = windArrow || null;
    els.windValue = windValue || null;
    if(!els.control || !els.head || !els.window) return;
    state.initialized = true;
    updateHeadVisual();
    setWindow(state.winBase.start, state.winBase.end);
    updateWindDisplay();
  }

  return {
    init,
    startHold,
    endHold,
    update,
    getPower: computePower,
    getScore,
    getReleaseScore: () => state.lastReleaseScore || 0,
    getReleasePos: () => state.lastReleasePos,
    setWind,
    getWind,
    resetRound,
    setWindow,
    isHolding
  };
})();

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
  updatePerfectLabel();
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

function getEnvWindFromSample(sample, windState){
  const mph = Math.max(0, Number(sample?.speed ?? windState?.baseSpeed ?? 0) || 0);
  const baseSpeed = Number(windState?.baseSpeed);
  const gust = Number.isFinite(baseSpeed) ? Math.max(0, mph - baseSpeed) : (sample?.isGust ? Math.max(0, mph * 0.25) : 0);
  const dirDeg = mapWindDirToDeg(sample?.dir || sample?.windDir || windState?.dir);
  return { mph, dirDeg, gust };
}

function updatePerfectLabel(){
  const running = state.round?.state === "RUNNING" && state.running;
  const sweetSpot = running ? state.sweetSpot : (state.round?.sweetSpotFinal || state.sweetSpot);
  if(ui.perfectLabel){
    if(!sweetSpot){
      ui.perfectLabel.textContent = "SWEET SPOT: —";
    }else{
      ui.perfectLabel.textContent = `SWEET SPOT: x${sweetSpot.minX.toFixed(2)} – x${sweetSpot.maxX.toFixed(2)}`;
    }
  }
  if(sweetSpot){
    const targetCenter = clamp01((sweetSpot.centerX - 1) / 4);
    const targetWidth = clamp((sweetSpot.widthX || (sweetSpot.maxX - sweetSpot.minX)) / 4, 0.06, 0.18);
    const start = clamp01(targetCenter - targetWidth / 2);
    const end = clamp01(targetCenter + targetWidth / 2);
    SwingTempo.setWindow(start, end);
    if(typeof ui._setTempoWindow === "function"){
      ui._setTempoWindow(start, end);
    }
  }
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
  const tempoPower = (typeof SwingTempo?.getPower === "function") ? SwingTempo.getPower() : (state.power ?? 0);
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
  const now = Number.isFinite(ts) ? ts : performance.now();
  if(state.phase !== RoundPhase.IDLE && state.phase !== RoundPhase.END) return false;
  resetRound("beginHold");
  state.phase = RoundPhase.ARMING;
  state.timestamps.holdStartMs = now;
  state.ui.canStart = false;
  state.tempo.holding = true;
  state.tempo.released = false;
  state.controls.tempoRelease = null;
  state.alignment.active = true;
  state.tempo.angleDeg = TEMPO_ARC.motionStart;
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
  initAlignmentRing();
  if(ui.perfectLabel){
    ui.perfectLabel.classList.add("gc-sweetspot--breathing");
    ui.perfectLabel.classList.remove("gc-sweetspot--pulse");
  }
  setButtons();
  return true;
}

function releaseSwing(ts, power = 0){
  const now = Number.isFinite(ts) ? ts : performance.now();
  if(state.phase !== RoundPhase.ARMING) return false;
  state.phase = RoundPhase.SWING;
  state.timestamps.releaseMs = now;
  state.tempo.holding = false;
  state.tempo.released = true;
  const tempoRelease = (typeof SwingTempo?.getReleasePos === "function") ? SwingTempo.getReleasePos() : 0;
  const tempoScore = (typeof SwingTempo?.getReleaseScore === "function") ? SwingTempo.getReleaseScore() : 0;
  const tempoHit = tempoScore > 0;
  const targetValue = 0.5;
  const windowWidth = clamp(state.alignment.sweetWidth / (Math.PI * 2), 0.03, 0.18);
  const half = windowWidth / 2;
  const alignValue = clamp(state.alignment.value || 0, 0, 1);
  const alignHit = Math.abs(alignValue - targetValue) <= half;
  state.alignment.hit = alignHit;
  state.alignment.frozenValue = alignValue;
  state.alignment.active = false;
  state.controls.tempoRelease = tempoRelease;
  state.round.faceAngleNorm = 0;
  state.round.faceAlignedAtRelease = alignHit;
  state.round.faceAlignedQuality01 = alignHit ? 1 : 0;
  updateAlignmentRingUI(state.alignment.frozenValue, state.alignment.sweetCenter, state.alignment.sweetWidth);
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
  const isHold = state.phase === RoundPhase.ARMING;
  const running = state.phase === RoundPhase.SWING || state.phase === RoundPhase.FLIGHT;
  state.running = running;
  SwingTempo.update(dtMs, { roundActive: running || isHold });
  if(state.phase === RoundPhase.ARMING){
    state.lastTs = ts;
    updateRoundWind(ts);
    updateWindHUD();
    updateAlignmentRing(ts, dtMs);
    updatePerfectLabel();
    sendFlightHUD();
    syncRendererState();
    return;
  }
  if(!running){
    state.lastTs = ts;
    sendFlightHUD();
    syncRendererState();
    return;
  }
  if(state.phase === RoundPhase.SWING){
    state.phase = RoundPhase.FLIGHT;
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
  updatePerfectLabel();
  if(state.impactUntilTs && ts < state.impactUntilTs){
    state.currentX = state.impactStartX || 1;
    state.round.flightProgress = 0;
    const liveYards = yardsFromX(state.currentX);
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
  const liveYards = yardsFromX(state.currentX);
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
  const windPenalty = clamp01((state.wind.mph || 0) / 20) * 0.1;
  const fatiguePenalty = clamp01(state.fatigue.level || 0) * 0.25;
  const highPower = (state.power || 0) >= 0.9;
  const baseCrashChance = highPower ? (windPenalty + fatiguePenalty) : 0;
  const matchScore = Number.isFinite(state.round.matchScore) ? state.round.matchScore : 1;
  const stabilityPenalty = clamp01(state.stability) * (1 - matchScore) * 0.12;
  const crashChance = highPower ? clamp(baseCrashChance + stabilityPenalty, 0.01, 0.99) : 0;
  const effectiveTarget = Math.max(1.05, landingTarget - crashChance);
  if(state.currentX >= effectiveTarget){
    const crashed = state.shotSetup ? effectiveTarget < state.shotSetup.expectedX * 0.75 : false;
    state.currentX = effectiveTarget;
    endRound(crashed ? "CRASH" : "STOP", ts);
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
  SwingTempo.setWind(shot.initialWind || shot.windSnapshot || shot.windState || {});
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
  updatePerfectLabel();
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
  updatePerfectLabel();
}

function initUI(){
  ensureAnim();
  setStatus("READY");
  setStatusState("ready");
  setBallIdle();
  setDistanceUI(0);
  flight.reset();
  renderFlights();
  updatePlayerUI();
  updateModeUI();
  updateTargetLine();
  updatePerfectLabel();
  updateAlignmentRingUI(state.alignment.value, state.alignment.sweetCenter, state.alignment.sweetWidth);
  setButtons();
  updateShotInfo();

  wireHoldToSwing();
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

function wireHoldToSwing(){
  const control = ui.tempoControl;
  const head = ui.tempoHead;
  const windowEl = ui.tempoWindow;
  if(!control || !head || !windowEl) return;

  SwingTempo.init({
    control,
    head,
    windowEl,
    windArrow: ui.swingWindArrow,
    windValue: ui.swingWindValue
  });

  const beginTempo = (e) => {
    if(state.phase !== RoundPhase.IDLE && state.phase !== RoundPhase.END) return;
    e?.preventDefault?.();
    console.log("[START CLICK] btn.disabled=", control?.disabled, "eventTarget=", e?.target);
    console.log("[START CLICK] dump=", window.DRIVIX_DUMP?.());
    if(!beginHold(performance.now())) return;
    SwingTempo.startHold();
  };

  const launchSwing = () => {
    const power = SwingTempo.endHold();
    if(power === null || power === undefined) return;
    releaseSwing(performance.now(), power);
  };

  control.addEventListener("pointerdown", (e) => {
    control.setPointerCapture?.(e.pointerId);
    beginTempo(e);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
    control.addEventListener(ev, (e) => {
      if(!SwingTempo.isHolding()) return;
      e.preventDefault();
      launchSwing();
    });
  });
  control.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      if(state.phase !== RoundPhase.IDLE && state.phase !== RoundPhase.END) return;
      if(!SwingTempo.isHolding()){
        beginTempo(e);
        setTimeout(launchSwing, 200);
      }else{
        launchSwing();
      }
    }
  });

  ui._setTempoWindow = SwingTempo.setWindow;
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
