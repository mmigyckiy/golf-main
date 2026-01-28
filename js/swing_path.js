/**
 * Swing Path - Alignment Ring UI Component
 * Converted to ES6 modules with shared utilities
 */
import { safeClamp01, polarToCartesianDeg, describeArcDeg } from './utils/math.js';
import { TEMPO_ARC_DEG, ALIGNMENT_RING } from './constants.js';

const FALLBACK = { cx: ALIGNMENT_RING.cx, cy: ALIGNMENT_RING.cy, r: ALIGNMENT_RING.FALLBACK_R };

const ui = {
  ring: null,
  svg: null,
  base: null,
  sweet: null,
  runner: null,
  ball: null
};

let geom = { cx: FALLBACK.cx, cy: FALLBACK.cy, r: FALLBACK.r };
let warnedMissing = false;

// Path state for lock/reset
const pathState = {
  headPos01: 0,
  locked: false,
  lockedPos01: 0
};

function clampArcDeg(deg){
  const start = TEMPO_ARC_DEG.arcStartDeg;
  const end = TEMPO_ARC_DEG.arcEndDeg;
  return Math.min(end, Math.max(start, deg));
}

function readGeometry(){
  if(!ui.svg) return;
  const viewBox = ui.svg.getAttribute("viewBox");
  if(viewBox){
    const parts = viewBox.split(/\s+/).map(Number);
    if(parts.length === 4 && parts.every(Number.isFinite)){
      const [minX, minY, w, h] = parts;
      const cx = minX + w / 2;
      const cy = minY + h / 2;
      const r = Math.max(0, Math.min(w, h) / 2 - 4);
      if(Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r) && r > 0){
        geom = { cx, cy, r };
        return;
      }
    }
  }
  geom = { ...FALLBACK };
}

function updateBase(){
  if(!ui.base) return;
  ui.base.setAttribute("d", describeArcDeg(geom.cx, geom.cy, geom.r, TEMPO_ARC_DEG.arcStartDeg, TEMPO_ARC_DEG.arcEndDeg));
}

function updateSweet(sweetCenterDeg, sweetWidthDeg){
  if(!ui.sweet) return;
  const half = Math.max(2, (Number(sweetWidthDeg) || 18) / 2);
  const center = Number.isFinite(sweetCenterDeg) ? sweetCenterDeg : TEMPO_ARC_DEG.targetDeg;
  const start = clampArcDeg(center - half);
  const end = clampArcDeg(center + half);
  ui.sweet.setAttribute("d", describeArcDeg(geom.cx, geom.cy, geom.r, start, end));
}

function updateRunner(headPos01){
  if(!ui.runner) return;
  const v = safeClamp01(headPos01);
  const span = TEMPO_ARC_DEG.arcEndDeg - TEMPO_ARC_DEG.arcStartDeg;
  const deg = TEMPO_ARC_DEG.arcStartDeg + span * v;
  const pos = polarToCartesianDeg(geom.cx, geom.cy, geom.r, deg);
  if(!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
  ui.runner.setAttribute("cx", pos.x.toFixed(2));
  ui.runner.setAttribute("cy", pos.y.toFixed(2));
}

function updateBall(){
  if(!ui.ball) return;
  const pos = polarToCartesianDeg(geom.cx, geom.cy, geom.r, TEMPO_ARC_DEG.targetDeg);
  if(!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
  ui.ball.setAttribute("cx", pos.x.toFixed(2));
  ui.ball.setAttribute("cy", pos.y.toFixed(2));
}

function init(){
  ui.ring = document.getElementById("alignmentRing");
  ui.svg = document.getElementById("alignmentSvg");
  ui.base = document.getElementById("alignmentBase");
  ui.sweet = document.getElementById("alignmentSweet");
  ui.runner = document.getElementById("alignmentRunner");
  ui.ball = document.getElementById("alignmentBall");
  if(!ui.svg || !ui.base || !ui.sweet || !ui.runner){
    if(!warnedMissing){
      console.warn("[SwingPath] Missing alignment SVG elements");
      warnedMissing = true;
    }
    return;
  }
  readGeometry();
  updateBase();
  updateSweet(TEMPO_ARC_DEG.targetDeg, 18);
  updateBall();
  updateRunner(0);
}

function setHolding(isHolding){
  if(!ui.ring) return;
  ui.ring.classList.toggle("is-holding", !!isHolding);
}

function update({ phase, headPos01, sweetCenter = 0, sweetWidthDeg = 18 } = {}){
  if(!ui.svg) return;
  const holding = phase === "ARMING";
  setHolding(holding);
  readGeometry();
  updateBase();
  const sweetCenterDeg = TEMPO_ARC_DEG.targetDeg + (Number(sweetCenter) || 0);
  updateSweet(sweetCenterDeg, sweetWidthDeg);
  updateBall();
  
  // Store current position
  if(holding && !pathState.locked){
    pathState.headPos01 = safeClamp01(headPos01);
  }
  
  // Use locked position if locked, otherwise current
  const displayPos = pathState.locked ? pathState.lockedPos01 : headPos01;
  if(holding || pathState.locked) updateRunner(displayPos);
}

function lockPath(){
  pathState.locked = true;
  pathState.lockedPos01 = pathState.headPos01;
}

function resetPath(){
  pathState.locked = false;
  pathState.lockedPos01 = 0;
  pathState.headPos01 = 0;
  updateRunner(0);
}

function getPathPos01(){
  if(pathState.locked) return pathState.lockedPos01;
  return pathState.headPos01;
}

function isPathLocked(){
  return pathState.locked;
}

// Export as ES6 module
export const SwingPath = { 
  init, 
  update, 
  setHolding,
  lockPath,
  resetPath,
  getPathPos01,
  isPathLocked
};

// Also expose on window for backward compatibility with non-module scripts
if(typeof window !== 'undefined'){
  window.SwingPath = SwingPath;
}
