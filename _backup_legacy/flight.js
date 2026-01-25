/* =========================
   Ball Flight Animation
   ========================= */

import { clamp, xToCarryYards, yardsToPixelX } from "./golfMath.js";

const flightConfig = { maxX: 6.0 };

let ballEl = null;
let flightEl = null;
let activeAnim = null;
let markersEl = null;

const dims = {
  w: 0,
  h: 0,
  padding: 16,
  ballSize: 18,
  startX: 0,
  endX: 0,
  landX: 0,
  baselineY: 0,
  yBase: 0
};

let lastX = 0;
let lastY = 0;
let strokeStartYards = 0;
let totalYards = 300;
let currentPreviewYards = null;

const flightState = {
  t0: 0,
  duration: 1000,
  fromX: 0,
  toX: 0,
  arcHeight: 28,
  groundY: 0,
  rafId: null,
  landed: true,
  dropping: false,
  progress: 0
};

function lerp(a, b, t){
  return a + (b - a) * t;
}

function progressFromX(x){
  return clamp((x - 1.0) / (flightConfig.maxX - 1.0), 0, 1);
}

function stopRaf(){
  if(flightState.rafId){
    cancelAnimationFrame(flightState.rafId);
    flightState.rafId = null;
  }
}

function stopActiveAnimations(){
  if(activeAnim){
    activeAnim.cancel();
    activeAnim = null;
  }
  stopRaf();
}

function applyTransform(x, y){
  if(!ballEl) return;
  const tx = x - dims.startX;
  ballEl.style.transform = `translate3d(${tx}px, ${y}px, 0)`;
  lastX = x;
  lastY = y;
}

function arcToXY(progress){
  const x = lerp(flightState.fromX, flightState.toX, progress);
  const y = flightState.groundY - flightState.arcHeight * Math.sin(Math.PI * progress);
  return { x, y };
}

function recalc(){
  if(!ballEl) return;
  flightEl = ballEl.closest(".flight") || ballEl.parentElement || flightEl;
  if(!flightEl) return;

  const padding = 16;
  const ballSize = ballEl.getBoundingClientRect().width || 18;
  const w = flightEl.clientWidth || dims.w || 1;
  const h = flightEl.clientHeight || dims.h || 1;

  dims.padding = padding;
  dims.ballSize = ballSize;
  dims.w = w;
  dims.h = h;
  dims.yBase = h * 0.58;
  dims.startX = padding;
  dims.endX = Math.max(dims.startX, w - padding - ballSize);
  dims.landX = dims.startX + (dims.endX - dims.startX) * 0.92;
  dims.baselineY = dims.yBase;
  flightState.groundY = 0;
  applyBallAtYards(currentPreviewYards ?? strokeStartYards);
}

export function initFlight(ballId = "ball"){
  ballEl = document.getElementById(ballId);
  if(!ballEl) return;
  flightEl = ballEl.closest(".flight") || ballEl.parentElement;
  markersEl = document.getElementById("flightMarkers") || flightEl?.querySelector(".flight-markers");
  recalc();
  window.addEventListener("resize", recalc);
  setBallYards(0);
}

export function updateFlight(x){
  if(!ballEl) return;
  if(!dims.w || !dims.h) recalc();
  if(currentPreviewYards !== null){
    previewBallYards(currentPreviewYards);
    return;
  }
  // fallback preview if not set externally
  const carry = xToCarryYards(x, flightConfig.maxX);
  const yards = clamp(strokeStartYards + carry, 0, totalYards);
  previewBallYards(yards);
}

function yardsToX(yards){
  return yardsToPixelX({
    yards,
    totalYards,
    startX: dims.startX,
    endX: dims.endX
  });
}

function applyBallAtYards(yards){
  const x = yardsToX(yards);
  applyTransform(x, flightState.groundY);
}

export function setStrokeStart(yards){
  strokeStartYards = clamp(yards, 0, totalYards);
  currentPreviewYards = strokeStartYards;
  if(ballEl) applyBallAtYards(strokeStartYards);
}

function addMarker(yards, cls = ""){
  if(!markersEl) return;
  const marker = document.createElement("div");
  marker.className = `flight-marker${cls ? " " + cls : ""}`;
  const x = yardsToX(yards);
  marker.style.left = `${x}px`;
  marker.style.top = `${dims.yBase}px`;
  markersEl.appendChild(marker);
}

export function animateShot(fromYards, toYards, outcome = "shot", duration = 420){
  if(!ballEl) return;
  if(!dims.w || !dims.h) recalc();
  stopActiveAnimations();
  const startXPos = yardsToX(fromYards);
  const endXPos = yardsToX(toYards);
  const startTx = startXPos - dims.startX;
  const endTx = endXPos - dims.startX;

  const keyframes = [
    { transform: `translate(${startTx}px, 0px)` },
    { transform: `translate(${(startTx + endTx) / 2}px, 0px)`, offset: 0.45 },
    { transform: `translate(${endTx}px, 0px)` }
  ];

  activeAnim = ballEl.animate(keyframes, {
    duration,
    easing: "cubic-bezier(.2,.8,.2,1)",
    fill: "forwards"
  });

  activeAnim.onfinish = () => {
    applyTransform(endXPos, flightState.groundY);
    activeAnim = null;
    lastX = endXPos;
    lastY = dims.baselineY;
  };

  const cls = outcome === "mishit" ? "mishit" : outcome === "holed" ? "holed" : "";
  addMarker(toYards, cls);
}

export function animateBallToYards(fromYards, toYards, duration = 420, outcome = "shot"){
  animateShot(fromYards, toYards, outcome, duration);
  currentPreviewYards = toYards;
}

export function setBallYards(yards){
  currentPreviewYards = yards;
  applyBallAtYards(yards);
}

export function previewBallYards(yards){
  currentPreviewYards = yards;
  applyBallAtYards(yards);
}

export function setStrokeStartYards(yards){
  setStrokeStart(yards);
}

export function resetFlight(){
  if(!ballEl) return;
  stopActiveAnimations();
  flightState.landed = true;
  flightState.dropping = false;
  flightState.progress = 0;
  if(!dims.w || !dims.h) recalc();
  applyTransform(dims.startX, flightState.groundY);
  lastX = dims.startX;
  lastY = dims.baselineY;
  ballEl.style.filter = "";
  ballEl.style.opacity = "";
  ballEl.style.transition = "";
  strokeStartYards = 0;
  currentPreviewYards = 0;
  if(markersEl) markersEl.innerHTML = "";
}

export function winFlight(){
  if(!ballEl) return;
  ballEl.style.filter = "drop-shadow(0 0 18px rgba(122,215,176,.35))";
  ballEl.style.opacity = "1";
}

export function loseFlight(){
  if(!ballEl) return;
  if(!dims.w || !dims.h) recalc();
  if(activeAnim){
    activeAnim.cancel();
    activeAnim = null;
  }
  stopRaf();
  if(flightState.dropping){
    ballEl.style.filter = "drop-shadow(0 0 14px rgba(231,161,161,.25))";
    ballEl.style.opacity = "0.9";
    return;
  }

  const startTx = lastX - dims.startX;
  const endTx = startTx;

  const keyframes = [
    { transform: `translate(${startTx}px, 0px)` },
    { transform: `translate(${endTx}px, 0px)` }
  ];

  activeAnim = ballEl.animate(keyframes, {
    duration: 280,
    easing: "cubic-bezier(.2,.8,.2,1)",
    fill: "forwards"
  });

  ballEl.style.filter = "drop-shadow(0 0 14px rgba(231,161,161,.25))";
  ballEl.style.opacity = "0.9";

  activeAnim.onfinish = () => {
    applyTransform(dims.startX + endTx, flightState.groundY);
    activeAnim = null;
    lastX = dims.startX + endTx;
    lastY = dims.baselineY;
  };
}

function defaultArcHeight(){
  return Math.max(18, dims.h ? dims.h * 0.32 : 28);
}

export function startFlight({ fromYards, toYards, holeDistanceYards, fromX, toX, durationMs, arcHeightPx } = {}){
  if(!ballEl) return;
  if(Number.isFinite(holeDistanceYards)) totalYards = holeDistanceYards;
  if(!dims.w || !dims.h) recalc();
  stopActiveAnimations();
  ballEl.style.transition = "";
  const now = performance.now();
  flightState.t0 = now;
  flightState.duration = durationMs ?? 1000;
  const resolvedFromX = Number.isFinite(fromYards) ? yardsToX(fromYards) : (fromX ?? dims.startX);
  const resolvedToX = Number.isFinite(toYards) ? yardsToX(toYards) : (toX ?? dims.landX);
  flightState.fromX = resolvedFromX;
  flightState.toX = resolvedToX;
  flightState.arcHeight = arcHeightPx ?? defaultArcHeight();
  flightState.groundY = 0;
  flightState.landed = false;
  flightState.dropping = false;
  flightState.progress = 0;
  applyTransform(flightState.fromX, flightState.groundY);
  flightState.rafId = requestAnimationFrame(update);
}

export function setProgress(progress){
  if(!ballEl) return 0;
  stopRaf();
  const p = clamp(progress, 0, 1);
  const { x, y } = arcToXY(p);
  ballEl.style.transition = "";
  applyTransform(x, y);
  flightState.progress = p;
  flightState.t0 = performance.now() - flightState.duration * p;
  flightState.landed = p >= 1;
  return p;
}

export function update(t){
  if(!ballEl) return 0;
  if(flightState.dropping) return flightState.progress;
  const now = Number.isFinite(t) ? t : performance.now();
  if(!flightState.t0) flightState.t0 = now;
  const p = clamp((now - flightState.t0) / (flightState.duration || 1), 0, 1);
  const { x, y } = arcToXY(p);
  ballEl.style.transition = "";
  applyTransform(x, y);
  flightState.progress = p;
  flightState.landed = p >= 1;
  if(!flightState.landed && flightState.rafId !== null){
    flightState.rafId = requestAnimationFrame(update);
  }else{
    stopRaf();
  }
  return p;
}

export function crashDrop(){
  if(!ballEl) return;
  stopActiveAnimations();
  flightState.dropping = true;
  const dropMs = 200;
  const x = Number.isFinite(lastX) ? lastX : flightState.fromX || dims.startX;
  ballEl.style.transition = `transform ${dropMs}ms cubic-bezier(.3,.7,.1,1)`;
  applyTransform(x, flightState.groundY);
  lastY = flightState.groundY;
  setTimeout(() => {
    flightState.landed = true;
    flightState.dropping = false;
    ballEl.style.transition = "";
  }, dropMs);
}

export function landNow(){
  if(!ballEl) return;
  stopRaf();
  flightState.dropping = true;
  const settleMs = 220;
  const x = Number.isFinite(lastX) ? lastX : flightState.toX || dims.landX || dims.startX;
  ballEl.style.transition = `transform ${settleMs}ms cubic-bezier(.2,.8,.2,1)`;
  applyTransform(x, flightState.groundY);
  lastY = flightState.groundY;
  setTimeout(() => {
    flightState.landed = true;
    flightState.dropping = false;
    ballEl.style.transition = "";
  }, settleMs);
}
