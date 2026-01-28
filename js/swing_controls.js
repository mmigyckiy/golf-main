/**
 * Swing Controls - Tempo and Alignment UI
 * Uses shared utilities and constants
 */
import { clamp, safeClamp01, polarToCartesianRad, describeArcRad } from './utils/math.js';
import { TEMPO_ARC_RAD, ALIGNMENT_RING } from './constants.js';

// Use imported constants
const TEMPO_ARC = TEMPO_ARC_RAD;

const ALIGN_RING_DEFAULTS = {
  cx: ALIGNMENT_RING.cx,
  cy: ALIGNMENT_RING.cy,
  r: ALIGNMENT_RING.r,
  gapRad: ALIGNMENT_RING.gapRad
};

function getRingGeometry(els){
  const svg = els.alignmentRing;
  if(svg){
    const viewBox = svg.getAttribute("viewBox");
    if(viewBox){
      const parts = viewBox.split(/\s+/).map(Number);
      if(parts.length === 4 && parts.every(Number.isFinite)){
        const [minX, minY, w, h] = parts;
        const cx = minX + w / 2;
        const cy = minY + h / 2;
        const r = Math.max(0, Math.min(w, h) / 2 - 2);
        return { cx, cy, r, gapRad: ALIGN_RING_DEFAULTS.gapRad };
      }
    }
  }
  return { ...ALIGN_RING_DEFAULTS };
}

const ui = {
  tempoControl: null,
  tempoHead: null,
  tempoWindow: null,
  alignmentRing: null,
  alignmentBase: null,
  alignmentSweet: null,
  alignmentRunner: null,
  perfectLabel: null
};

const tempoState = {
  active: false,
  t: 0,
  speed: (Math.PI * 2) / 1.8,
  fatigueFactor: 1,
  noisePhase: 0,
  headPos: 0,
  angle: TEMPO_ARC.targetAngle,
  holdStartMs: 0,
  locked: false,
  lockedHeadPos: 0
};

let warnedNaN = false;
let _warned = false;
let _disabledUntil = 0;

function onceWarn(msg, obj){
  if(_warned) return;
  _warned = true;
  console.warn(msg, obj || "");
}

function safe(fn, label){
  const now = performance.now();
  if(now < _disabledUntil) return;
  try{
    fn();
  }catch(err){
    _disabledUntil = now + 500;
    if(!_warned){
      _warned = true;
      console.warn("[SwingControls] disabled temporarily due to error:", label, err);
    }
  }
}

function ensureTempoDOM(){
  const control = ui.tempoControl || document.getElementById("swingTempoControl");
  const head = ui.tempoHead || document.getElementById("swingTempoRunner") || document.getElementById("swingTempoHead");
  if(!control || !head) return null;
  // For vertical meter, track is the tube element
  const track = control.querySelector(".tempo-meter__tube") || control.querySelector(".swing-tempo__track") || control;
  const trackStyle = getComputedStyle(track);
  if(trackStyle.position === "static") track.style.position = "relative";
  head.style.position = "absolute";
  // Vertical meter: don't set top, let CSS handle positioning
  return { control, track, head };
}

function updateSwingTempoUI(headPos01){
  const dom = ensureTempoDOM();
  if(!dom) return;
  const v = safeClamp01(headPos01);
  const trackRect = dom.track.getBoundingClientRect();
  const headRect = dom.head.getBoundingClientRect();
  // Vertical meter: use bottom positioning, keep left/right from CSS for centering
  const travel = Math.max(0, trackRect.height - headRect.height - 16); // 16px = top/bottom padding
  const y = 8 + travel * v; // 8px bottom padding
  dom.head.style.bottom = `${y.toFixed(2)}px`;
  dom.head.style.left = ""; // Clear any left override, let CSS handle horizontal centering
  dom.head.style.transform = ""; // Remove horizontal transform
}

function updateSwingTempoWindowUI(start01, end01){
  if(!ui.tempoWindow) return;
  const span = Math.max(0.02, end01 - start01);
  ui.tempoWindow.style.left = `${start01 * 100}%`;
  ui.tempoWindow.style.width = `${span * 100}%`;
}

function updateAlignmentRingUI(state){
  if(!ui.alignmentRing || !ui.alignmentSweet || !ui.alignmentRunner) return;
  const { cx, cy, r, gapRad } = getRingGeometry(ui);
  if(!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)){
    if(!warnedNaN){
      warnedNaN = true;
      onceWarn("[SwingControls] invalid alignment ring geometry", { cx, cy, r });
    }
    return;
  }
  const safeCx = cx;
  const safeCy = cy;
  const safeRadius = r;
  const arcStart = gapRad / 2;
  const arcEnd = Math.PI * 2 - gapRad / 2;
  if(ui.alignmentBase){
    ui.alignmentBase.setAttribute("d", describeArcRad(safeCx, safeCy, safeRadius, arcStart, arcEnd));
  }
  const targetAngle = TEMPO_ARC.targetAngle;
  const centerAngle = targetAngle + (state.alignment?.sweetCenter || 0);
  const sweetHalf = (state.alignment?.sweetWidth || 0) / 2;
  const sweetStart = clamp(centerAngle - sweetHalf, arcStart, arcEnd);
  const sweetEnd = clamp(centerAngle + sweetHalf, arcStart, arcEnd);
  ui.alignmentSweet.setAttribute("d", describeArcRad(safeCx, safeCy, safeRadius, sweetStart, sweetEnd));
  const rawAngle = (state?.tempo?.lockedAngle ?? state?.tempo?.angle);
  const runnerAngle = Number.isFinite(rawAngle) ? rawAngle : TEMPO_ARC.targetAngle;
  const pos = {
    x: safeCx + safeRadius * Math.cos(runnerAngle),
    y: safeCy + safeRadius * Math.sin(runnerAngle)
  };
  if(!Number.isFinite(pos.x) || !Number.isFinite(pos.y)){
    if(!warnedNaN){
      warnedNaN = true;
      onceWarn("[SwingControls] alignment runner NaN", { pos, runnerAngle, safeCx, safeCy, safeRadius });
    }
    return;
  }
  ui.alignmentRunner.setAttribute("cx", pos.x.toFixed(2));
  ui.alignmentRunner.setAttribute("cy", pos.y.toFixed(2));
}

function syncPerfectLabel(state){
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
    const targetCenter = safeClamp01((sweetSpot.centerX - 1) / 4);
    const targetWidth = clamp((sweetSpot.widthX || (sweetSpot.maxX - sweetSpot.minX)) / 4, 0.06, 0.18);
    const start = safeClamp01(targetCenter - targetWidth / 2);
    const end = safeClamp01(targetCenter + targetWidth / 2);
    state.tempo = state.tempo || {};
    state.tempo.windowStart = start;
    state.tempo.windowEnd = end;
    updateSwingTempoWindowUI(start, end);
  }
}

function updateTempoMotion(dtMs){
  if(!tempoState.active) return;
  const dt = Math.max(0.001, (dtMs || 0) / 1000);
  tempoState.t += dt;
  tempoState.noisePhase += dt * 0.9;
  const wobble = 1 + 0.04 * Math.sin(tempoState.noisePhase);
  const phase = tempoState.t * tempoState.speed * tempoState.fatigueFactor * wobble;
  tempoState.headPos = 0.5 + 0.5 * Math.sin(phase);
  tempoState.angle = TEMPO_ARC.motionStart + (TEMPO_ARC.motionEnd - TEMPO_ARC.motionStart) * tempoState.headPos;
}

function init(state){
  safe(() => {
    ui.tempoControl = document.getElementById("swingTempoControl");
    ui.tempoHead = document.getElementById("swingTempoHead");
    ui.tempoWindow = document.getElementById("swingTempoWindow");
    ui.alignmentRing = document.getElementById("alignmentRing");
    ui.alignmentBase = document.getElementById("alignmentBase");
    ui.alignmentSweet = document.getElementById("alignmentSweet");
    ui.alignmentRunner = document.getElementById("alignmentRunner");
    ui.perfectLabel = document.getElementById("perfectWindowLabel");
    tempoState.angle = TEMPO_ARC.targetAngle;
    tempoState.headPos = 0;
    state.tempo = state.tempo || {};
    state.tempo.angle = tempoState.angle;
    syncPerfectLabel(state);
    updateAlignmentRingUI(state);
    updateSwingTempoUI(tempoState.headPos);
  }, "init");
}

function beginHold(startMs, state){
  tempoState.active = true;
  tempoState.t = 0;
  tempoState.noisePhase = 0;
  tempoState.holdStartMs = Number.isFinite(startMs) ? startMs : performance.now();
  tempoState.headPos = 0;
  tempoState.angle = TEMPO_ARC.motionStart;
  state.tempo = state.tempo || {};
  state.tempo.angle = tempoState.angle;
}

function releaseSwing(_ts, state){
  tempoState.active = false;
  state.tempo = state.tempo || {};
  state.tempo.angle = tempoState.angle;
}

function update(ts, dtMs, state, phaseFlags){
  const holdActive = !!phaseFlags?.holdActive;
  if(holdActive && !tempoState.active){
    beginHold(state?.timestamps?.holdStartMs || ts, state);
  }
  if(holdActive){
    updateTempoMotion(dtMs);
    state.tempo = state.tempo || {};
    state.tempo.angle = tempoState.angle;
    safe(() => {
      updateSwingTempoUI(tempoState.headPos);
      const normalized = safeClamp01(tempoState.headPos);
      state.alignment = state.alignment || {};
      state.alignment.value = normalized;
      updateAlignmentRingUI(state);
    }, "update");
  }
}

function syncFromState(state){
  safe(() => {
    syncPerfectLabel(state);
    updateAlignmentRingUI(state);
  }, "syncFromState");
}

function getTempoHeadPos(){
  // Return locked value if locked, otherwise current
  if(tempoState.locked && Number.isFinite(tempoState.lockedHeadPos)){
    return safeClamp01(tempoState.lockedHeadPos);
  }
  return safeClamp01(tempoState.headPos);
}

function lockTempo(){
  tempoState.locked = true;
  tempoState.lockedHeadPos = tempoState.headPos;
  tempoState.active = false;
}

function resetTempo(){
  tempoState.active = false;
  tempoState.locked = false;
  tempoState.lockedHeadPos = 0;
  tempoState.headPos = 0;
  tempoState.t = 0;
  tempoState.noisePhase = 0;
  tempoState.angle = TEMPO_ARC.targetAngle;
  safe(() => updateSwingTempoUI(0), "resetTempo");
}

function isTempoLocked(){
  return tempoState.locked;
}

export const SwingControls = {
  init,
  beginHold,
  releaseSwing,
  update,
  syncFromState,
  getTempoHeadPos,
  lockTempo,
  resetTempo,
  isTempoLocked
};
