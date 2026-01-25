/**
 * Flight Engine Contract (stable)
 * - initFlight3D(opts): opts.canvasId|string. Returns engine object or null. Never throws.
 * - startFlight(params): { targetYards?, duration?, onTick?, onEnd?, onCrash?, multiplier? }
 *   - Validates targetYards number in [0,2000]; duration clamped; on invalid input calls onEnd({finalYards:0, crashed:true, reason:"invalid_input"})
 * - crashNow(): stops current flight, calls onCrash/onEnd once. Never throws.
 * - reset(): clears state/render safely.
 * - isRunning(): boolean.
 * Guarantee: All public calls are wrapped to avoid throwing to callers.
 */
"use strict";
import { Trail } from "./trail.js";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const DEBUG = false;
const DEBUG_HUD = true;
const MAX_YARDS = 360;
const FLIGHT_SELF_TEST = false;
const SCALE_PADDING_BOTTOM = 14;
const SCALE_HEIGHT = 26;
const BOUNCE_KEYFRAMES = [8, 4, 2];
const BOUNCE_TIMES = [160, 140, 120]; // ms per bounce, visual only
const DUST_DURATION = 240;
const BOUNCE_AMP = 10;
const BOUNCE_DECAY = 4.2;
const BOUNCE_FREQ = 11;
const BOUNCE_DURATION = 650;
const VISUAL_MAX_YARDS = 500;
const ARC_HEIGHT_PX = 96;
const TRAIL_MAX_POINTS = 22;
const TRAIL_MAX_AGE = 800; // ms

let canvas, ctx;
let trailSvg, trailLine;
let cssW = 0;
let cssH = 0;
let dpr = 1;
let rafId = null;
let running = false;
let lastTs = 0;
let renderState = "idle"; // idle | running | crashing | landed
let debugLogCount = 0;
let flightStartTs = 0;

const grid = { offset: 0, speed: 120 };
const camera = { x: 0, target: 0 };
let currentVisualYards = 0;

const ball = {
  x: 0,
  y: 0,
  radius: 7,
  startX: 0,
  groundY: 0,
  rangeX: 0
};

const flightState = {
  p: 0,
  duration: 1200,
  targetYards: 240,
  startYards: 0,
  currentYards: 0,
  targetRange: 0,
  maxH: 80,
  state: "idle", // idle | fly | crash | landed | live
  dropP: 0,
  dropFromY: 0,
  onTick: null,
  onEnd: null,
  onCrash: null,
  multiplier: 1,
  apexY: null,
  apexSpark: 0,
  signature: null
  ,
  liveProgress: 0
};

const gradients = {
  bg: null,
  ground: null
};

const fairwayTexture = [];
const trailPoints = [];
const impactFx = [];
const bounceState = { active:false, start:0, done:false };
const dustFx = [];
let crashRollTargetX = 0;
let crashRollStartX = 0;
let dustPlayed = false;
let audioCtx = null;
let prevEnded = false;

let trail = null;

function resizeCanvas() {
  if (!canvas) return;
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cssW = canvas.clientWidth || canvas.width || 640;
  cssH = canvas.clientHeight || canvas.height || 360;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  gradients.bg = ctx.createLinearGradient(0, 0, 0, cssH);
  gradients.bg.addColorStop(0, "#04060a");
  gradients.bg.addColorStop(0.38, "#060912");
  gradients.bg.addColorStop(0.72, "#05070c");
  gradients.bg.addColorStop(1, "#040509");

  gradients.ground = ctx.createLinearGradient(0, cssH * 0.55, 0, cssH);
  gradients.ground.addColorStop(0, "rgba(20,24,30,0.8)");
  gradients.ground.addColorStop(1, "rgba(10,12,16,1)");

  ball.groundY = cssH * 0.82;
  ball.startX = cssW * 0.08;
  ball.rangeX = cssW * 0.84;
  ball.radius = 7;
  resetBall(false);
  camera.x = 0;
  fairwayTexture.length = 0;
  const dotCount = 120;
  for (let i = 0; i < dotCount; i++) {
    fairwayTexture.push({
      x: Math.random(),
      y: Math.random()
    });
  }
  clearTrail();
}

function resetBall(resetState = true) {
  ball.x = ball.startX;
  ball.y = ball.groundY;
  flightState.p = 0;
  flightState.dropP = 0;
  flightState.state = resetState ? "idle" : flightState.state;
  flightState.currentYards = 0;
  flightState.liveProgress = 0;
  trailPoints.length = 0;
  if (trail) trail.reset();
  bounceState.active = false;
  bounceState.start = 0;
  bounceState.done = false;
  dustFx.length = 0;
  dustPlayed = false;
  crashRollStartX = ball.startX;
  crashRollTargetX = ball.startX;
  if (resetState) flightStartTs = 0;
}

function worldToScreen(x) {
  return x - camera.x;
}

function drawBackground() {
  ctx.fillStyle = gradients.bg || "#05070b";
  ctx.fillRect(0, 0, cssW, cssH);

  const horizon = cssH * 0.48;
  const haze = ctx.createLinearGradient(0, horizon - 20, 0, horizon + 40);
  haze.addColorStop(0, "rgba(255,255,255,0)");
  haze.addColorStop(0.5, "rgba(255,255,255,0.05)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - 20, cssW, 60);

  // glassy top highlight
  const glass = ctx.createLinearGradient(0, 0, 0, cssH * 0.12);
  glass.addColorStop(0, "rgba(255,255,255,0.04)");
  glass.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, cssW, cssH * 0.12);
}

function drawCourse() {
  // Abstract space: no ground visuals, only subtle radial depth
  const centerGrad = ctx.createRadialGradient(cssW * 0.5, cssH * 0.6, cssW * 0.05, cssW * 0.5, cssH * 0.6, cssW * 0.7);
  centerGrad.addColorStop(0, "rgba(255,255,255,0.04)");
  centerGrad.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawTrajectoryHint() {
  if (flightState.state !== "fly") return;
  ctx.save();
  ctx.strokeStyle = "rgba(232,236,233,0.14)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const samples = 20;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const worldX = ball.startX + flightState.targetRange * t;
    const lift = Math.sin(Math.PI * t) * flightState.maxH;
    const y = ball.groundY - lift;
    const sx = worldToScreen(worldX);
    if (i === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrail() {
  const now = performance.now();
  // Trim old points by age and cap count to keep the trail short and subtle
  while (trailPoints.length && now - trailPoints[0].t > TRAIL_MAX_AGE) {
    trailPoints.shift();
  }
  if (trailPoints.length > TRAIL_MAX_POINTS) {
    trailPoints.splice(0, trailPoints.length - TRAIL_MAX_POINTS);
  }
  if (!trailPoints.length) return;
  const pts = trailPoints;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const ageNorm = clamp((now - b.t) / TRAIL_MAX_AGE, 0, 1);
    const freshness = 1 - ageNorm;
    const alpha = 0.32 * Math.pow(freshness, 1.4);
    const width = 1 + 1.2 * freshness;
    const midX = (a.sx + b.sx) * 0.5;
    const midY = (a.sy + b.sy) * 0.5;
    ctx.strokeStyle = `rgba(233,237,241,${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.quadraticCurveTo(a.sx, a.sy, midX, midY);
    ctx.stroke();
  }
  ctx.restore();
}
function drawBall(visual) {
  const frameRight = cssW - 12;
  const clamped = visual.screenX >= frameRight - 0.5;
  const shadowScale = clamp((visual.visualY - ball.radius) / ball.groundY, 0, 1);
  const jitterY = (Math.random() * 2 - 1) * 0.5;
  const shadowY = ball.groundY + ball.radius * 0.4 + jitterY;
  const drawRadius = ball.radius * 0.9;
  const shadowWidth = drawRadius * (2.6 - 1.4 * shadowScale);
  const shadowHeight = drawRadius * (0.8 - 0.3 * shadowScale);
  const bounceOffset = getBounceOffset();
  const renderY = visual.visualY - bounceOffset;

  ctx.save();
  const fade = renderState === "crashing" ? 0.6 : renderState === "landed" ? 0.75 : 1;
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  const shadowScaleY = 1 + bounceOffset * 0.02;
  ctx.ellipse(visual.screenX, shadowY, shadowWidth, shadowHeight * shadowScaleY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball body with soft internal highlight, no halo
  const base = ctx.createRadialGradient(visual.screenX - drawRadius * 0.25, renderY - drawRadius * 0.25, drawRadius * 0.1, visual.screenX, renderY, drawRadius);
  base.addColorStop(0, "rgba(245,246,247,1)");
  base.addColorStop(1, "rgba(220,224,228,0.9)");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(visual.screenX, renderY, drawRadius, 0, Math.PI * 2);
  ctx.fill();

  // Specular micro highlight
  ctx.fillStyle = clamped ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(visual.screenX - drawRadius * 0.35, renderY - drawRadius * 0.35, Math.max(2, drawRadius * 0.35), 0, Math.PI * 2);
  ctx.fill();

  // Apex shimmer
  if(flightState.apexSpark > 0.01){
    const alpha = Math.min(0.4, flightState.apexSpark);
    const radius = drawRadius * 2.4;
    const grd = ctx.createRadialGradient(visual.screenX, renderY, radius * 0.2, visual.screenX, renderY, radius);
    grd.addColorStop(0, `rgba(216,200,166,${alpha})`);
    grd.addColorStop(1, `rgba(216,200,166,0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(visual.screenX, renderY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground focus glow
  const focusAlpha = 0.22;
  const focusRadiusX = drawRadius * 7.2;
  const focusRadiusY = drawRadius * 3.2;
  ctx.fillStyle = `rgba(216,200,166,${focusAlpha})`;
  ctx.beginPath();
  ctx.ellipse(visual.screenX, ball.groundY + drawRadius * 0.4, focusRadiusX, focusRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t){
  const clamped = clamp(t, 0, 1);
  const inv = 1 - clamped;
  return 1 - inv * inv * inv;
}

function computeFlightVisual(now = performance.now()){
  const isLive = flightState.state === "live";
  const isFlying = flightState.state === "fly" || isLive;
  const realYardsBase = isFlying
    ? (flightState.currentYards || flightState.targetYards || 0)
    : (flightState.currentYards || flightState.targetYards || 0);
  const progress = isLive
    ? clamp(flightState.liveProgress ?? (realYardsBase / VISUAL_MAX_YARDS), 0, 1)
    : (flightState.state === "fly"
      ? clamp((now - flightStartTs) / flightState.duration, 0, 1)
      : 1);
  const currentYards = isFlying ? realYardsBase : (flightState.currentYards || realYardsBase || 0);
  const drawYards = Math.min(isFlying ? currentYards : realYardsBase, VISUAL_MAX_YARDS);
  const yardRatio = clamp(drawYards / VISUAL_MAX_YARDS, 0, 1);
  const targetX = ball.startX + ball.rangeX * yardRatio;
  const eased = isFlying ? easeOutCubic(progress) : 1;
  const visualX = lerp(ball.startX, targetX, eased);
  const arc = isFlying ? 4 * progress * (1 - progress) : 0;
  const yLift = arc * ARC_HEIGHT_PX;
  const visualY = isFlying ? ball.groundY - yLift : ball.y;
  return {
    now,
    isFlying,
    progress,
    realYards: realYardsBase,
    currentYards,
    drawYards,
    targetX,
    visualX,
    visualY,
    arc
  };
}

function computeDuration(yards) {
  const minMs = 900;
  const maxMs = 2200;
  const ratio = clamp(yards / MAX_YARDS, 0, 1);
  const eased = 0.55 + ratio * 0.45; // bias toward longer flights taking longer
  return clamp(minMs + (maxMs - minMs) * eased, minMs, maxMs);
}

function setFlightTarget(yards) {
  const safeYards = clamp(yards, 0, 2000);
  flightState.targetYards = safeYards;
  flightState.startYards = flightState.currentYards || 0;
  const ratio = clamp(safeYards / MAX_YARDS, 0, 1);
  flightState.targetRange = ball.rangeX * ratio;
  flightState.duration = computeDuration(safeYards);
  flightState.maxH = cssH * (0.18 + 0.08 * ratio);
}

function stepFlight(dt) {
  let yards;
  if (flightState.state === "crash") {
    flightState.dropP = clamp(flightState.dropP + dt / 0.18, 0, 1);
    ball.y = lerp(flightState.dropFromY, ball.groundY, flightState.dropP);
    const rollT = clamp(Math.pow(flightState.dropP, 0.7), 0, 1);
    ball.x = lerp(crashRollStartX, crashRollTargetX, rollT);
    if (flightState.dropP >= 1) {
      flightState.state = "landed";
      renderState = "landed";
      running = false;
      addImpactFx();
      addDustFx();
      playImpactSound();
      startBounce();
      if (flightState.onCrash) flightState.onCrash();
    }
    return;
  }

  if (flightState.state === "live") {
    const drawDistance = Math.min(flightState.currentYards, VISUAL_MAX_YARDS);
    const ratio = clamp(drawDistance / VISUAL_MAX_YARDS, 0, 1);
    const drawWorldX = ball.startX + ball.rangeX * ratio;
    const sx = worldToScreen(drawWorldX);
    const p = clamp(flightState.liveProgress ?? ratio, 0, 1);
    const lift = Math.sin(Math.PI * p) * flightState.maxH;
    ball.x = drawWorldX;
    ball.y = ball.groundY - lift;
    const sy = ball.y;
    const t = performance.now();
    trailPoints.push({ sx, sy, t });
    while (trailPoints.length && t - trailPoints[0].t > TRAIL_MAX_AGE) {
      trailPoints.shift();
    }
    if (trailPoints.length > TRAIL_MAX_POINTS) {
      trailPoints.splice(0, trailPoints.length - TRAIL_MAX_POINTS);
    }
    currentVisualYards = flightState.currentYards;
    if (trail) trail.addPoint(ball.x, ball.y, performance.now());
    return;
  }

  if (flightState.state !== "fly") return;

  flightState.p = clamp(flightState.p + dt * 1000 / flightState.duration, 0, 1);
  const xTarget = ball.startX + flightState.targetRange;
  const nextX = ball.startX + flightState.targetRange * flightState.p;
  ball.x = Math.max(ball.x, nextX);
  const lift = Math.sin(Math.PI * flightState.p) * flightState.maxH;
  ball.y = ball.groundY - lift;
  yards = flightState.startYards + (flightState.targetYards - flightState.startYards) * flightState.p;
  const drawDistance = Math.min(yards, VISUAL_MAX_YARDS);
  const drawWorldX = ball.startX + ball.rangeX * clamp(drawDistance / VISUAL_MAX_YARDS, 0, 1);
  const sx = worldToScreen(drawWorldX);
  const sy = ball.y;
  const t = performance.now();
  trailPoints.push({ sx, sy, t });
  while (trailPoints.length && t - trailPoints[0].t > TRAIL_MAX_AGE) {
    trailPoints.shift();
  }
  if (trailPoints.length > TRAIL_MAX_POINTS) {
    trailPoints.splice(0, trailPoints.length - TRAIL_MAX_POINTS);
  }
  flightState.currentYards = yards;
  currentVisualYards = yards;
  if (trail) trail.addPoint(ball.x, ball.y, performance.now());
  // Apex detection
  if(flightState.apexY === null || ball.y < flightState.apexY){
    flightState.apexY = ball.y;
  }
  if(flightState.apexY !== null){
    const threshold = flightState.apexY + flightState.maxH * 0.08;
    if(ball.y <= threshold){
      flightState.apexSpark = Math.min(1, flightState.apexSpark + dt * 6);
    }else{
      flightState.apexSpark = Math.max(0, flightState.apexSpark - dt * 4);
    }
  }

  if (flightState.onTick) flightState.onTick({ p: flightState.p, x: ball.x, y: ball.y, yards, isAirborne:true });

  if (flightState.p >= 1) {
    flightState.state = "landed";
    renderState = "landed";
    ball.y = ball.groundY;
    if (trail) trail.fadeOut(500);
    addImpactFx();
    addDustFx();
    playImpactSound();
    startBounce();
    running = false;
    if (flightState.onEnd) flightState.onEnd({ x: xTarget, finalYards: yards, crashed:false, xMultiplierAtEnd: flightState.multiplier });
  }
}

function render(now = performance.now(), visualState = computeFlightVisual(now)) {
  if (!ctx) return;
  ctx.clearRect(0, 0, cssW, cssH);
  const frameRight = cssW - 12;
  const screenX = Math.min(worldToScreen(visualState.visualX), frameRight);
  const visual = { ...visualState, screenX, clampedX: screenX >= frameRight - 0.5 };
  const realYards = visual.realYards || 0;
  const visualYards = Math.min(realYards, VISUAL_MAX_YARDS);
  currentVisualYards = visualYards;
  const inZone = realYards >= 350;
  const isRecord = realYards >= 500;
  const fit = computeVisualFit(visualYards);
  const cx = cssW * 0.5;
  const cy = cssH * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(fit, fit);
  ctx.translate(-cx, -cy);
  ctx.save();
  roundRect(ctx, 0, 0, cssW, cssH, 16);
  ctx.clip();
  drawBackground();
  drawCourse();
  drawFarHaze();
  drawTrajectoryHint();
  drawTrail();
  drawDust();
  drawBall(visual);
  if (DEBUG_HUD) drawDebugOverlay(visual);
  drawImpacts();
  drawVignette();
  drawFarFade();
  drawBadges(realYards, inZone, isRecord);
  drawDistanceTags(realYards, inZone, isRecord);
  drawScaleOverlay();
  if (DEBUG) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px 'Inter', system-ui, -apple-system, BlinkMacSystemFont";
    ctx.fillText(`ballX: ${ball.x.toFixed(1)} ballY: ${ball.y.toFixed(1)}`, 12, 18);
    ctx.fillText(`cameraX: ${camera.x.toFixed(1)}`, 12, 34);
  }
  ctx.restore();
  ctx.restore();
}

function loop(ts) {
  if (!running) {
    rafId = null;
    return;
  }
  if (!lastTs) lastTs = ts;
  const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
  lastTs = ts;

  stepFlight(dt);

  const visual = computeFlightVisual(ts);
  const screenX = worldToScreen(visual.visualX);
  const minScreen = cssW * 0.25;
  const maxScreen = cssW * 0.7;
  let desiredCam = camera.x;
  if (screenX > maxScreen) {
    desiredCam = visual.visualX - maxScreen;
  } else if (screenX < minScreen) {
    desiredCam = Math.max(0, visual.visualX - minScreen);
  }
  desiredCam = Math.max(0, desiredCam);
  camera.x += (desiredCam - camera.x) * clamp(6 * dt, 0, 1);

  const ended = !running && (renderState === "landed" || renderState === "crashing" || flightState.state === "landed" || flightState.state === "crash");
  detectBounceTransition(ended);
  render(ts, visual);
  prevEnded = ended;

  rafId = window.requestAnimationFrame(loop);
}

export function initFlight3D(canvasId) {
  try{
    const id = typeof canvasId === "string" ? canvasId : canvasId?.canvasId;
    const el = typeof id === "string" ? document.getElementById(id) : null;
    if (!el || !(el instanceof HTMLCanvasElement)) {
      console.warn("[flight3d] canvas not found", id);
      return makeNoopEngine("missing_canvas");
    }
    canvas = el;
    ctx = canvas.getContext("2d");
    trailSvg = document.getElementById("trailSvg");
    trailLine = document.getElementById("trailLine");
    try{
      trail = new Trail(140, 6);
    }catch(err){
      console.warn("[flight3d] Trail init failed", err);
      trail = null;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    render();
    const engine = {
      startFlight3D,
      startLiveFlight3D,
      setLiveDistance,
      updateFlight3D,
      crashFlight3D,
      landFlight3D,
      resetFlight3D,
      getFlightDistanceYards,
      startFlight,
      crashNow: crashFlight3D,
      reset: resetFlight3D,
      isRunning: () => !!running
    };
    if(FLIGHT_SELF_TEST) runFlightSelfTest(engine);
    return engine;
  }catch(err){
    console.error("[flight3d] init error", err);
    return makeNoopEngine("init_error");
  }
}

export function startFlight(opts = {}) {
  startFlightInternal(opts);
}

export function startLiveFlight3D(initialYards = 0){
  try{
    if(running){
      resetBall(false);
      running = false;
    }
    running = true;
    lastTs = 0;
    renderState = "running";
    resetBall(false);
    flightState.state = "live";
    flightState.currentYards = clamp(initialYards, 0, 2000);
    flightState.targetYards = flightState.currentYards;
    const ratio = clamp(Math.min(flightState.currentYards, VISUAL_MAX_YARDS) / VISUAL_MAX_YARDS, 0, 1);
    flightState.maxH = cssH * (0.18 + 0.08 * ratio);
    flightState.liveProgress = ratio;
    crashRollStartX = ball.startX;
    crashRollTargetX = ball.startX;
    flightStartTs = performance.now();
    if (trail) trail.reset();
    trailPoints.length = 0;
    debugLogCount = 0;
    if (!rafId) rafId = window.requestAnimationFrame(loop);
  }catch(err){
    console.error("[flight3d] startLiveFlight3D error", err);
  }
}

export function crashNow(){
  crashFlight3D();
}

export function reset(){
  resetFlight3D();
}

export function isRunning(){
  return !!running;
}

function startFlightInternal(params = {}) {
  try{
    const target = Number.isFinite(params.targetYards) ? clamp(params.targetYards, 0, 2000) : flightState.targetYards || 240;
    const duration = Number.isFinite(params.duration) ? clamp(params.duration, 300, 4000) : undefined;
    flightState.onTick = params.onTick || null;
    flightState.onEnd = params.onEnd || null;
    flightState.onCrash = params.onCrash || null;
    flightState.multiplier = Number.isFinite(params.multiplier) ? params.multiplier : flightState.multiplier;
    flightState.signature = params.isNewBest || params.isPerfect ? params : null;
    if(!Number.isFinite(target)){
      if(flightState.onEnd) flightState.onEnd({ finalYards:0, crashed:true, reason:"invalid_input" });
      return;
    }
    if(running){
      resetBall(false);
      running = false;
    }
    running = true;
    lastTs = 0;
    renderState = "running";
    resetBall(false);
    setFlightTarget(target);
    if(duration) flightState.duration = duration;
    flightState.p = 0;
    flightState.state = "fly";
    flightState.apexY = null;
    flightState.apexSpark = 0;
    flightStartTs = performance.now();
    if (trail) trail.reset();
    trailPoints.length = 0;
    debugLogCount = 0;
    if (!rafId) rafId = window.requestAnimationFrame(loop);
  }catch(err){
    console.error("[flight3d] startFlight error", err);
    try{ if(flightState.onEnd) flightState.onEnd({ finalYards:0, crashed:true, reason:"error" }); }catch(_){}
  }
}

export function startFlight3D() { startFlightInternal(); }

export function updateFlight3D(multiplier = 1, _t = 0) {
  if (renderState !== "running" || flightState.state === "live") return;
  const power = clamp(multiplier, 0.6, 8);
  flightState.multiplier = power;
  const estYards = clamp(220 + (power - 1) * 55, 0, 2000);
  setFlightTarget(estYards);
}

export function setLiveDistance(yards = 0){
  if(renderState !== "running" || flightState.state !== "live") return;
  const clamped = clamp(yards, 0, 2000);
  flightState.currentYards = clamped;
  flightState.targetYards = clamped;
  const ratio = clamp(Math.min(clamped, VISUAL_MAX_YARDS) / VISUAL_MAX_YARDS, 0, 1);
  flightState.liveProgress = ratio;
  flightState.maxH = cssH * (0.18 + 0.08 * ratio);
}

export function crashFlight3D(finalYards) {
  try{
    if (renderState === "crashing" || renderState === "landed") return;
    renderState = "crashing";
    flightState.state = "crash";
    flightState.dropP = 0;
    flightState.dropFromY = ball.y;
    crashRollStartX = ball.x;
    const maxRoll = ball.rangeX * 0.01;
    let targetX = ball.x + maxRoll;
    if (Number.isFinite(finalYards)) {
      const clamped = clamp(finalYards, 0, 2000);
      const ratio = clamp(Math.min(clamped, VISUAL_MAX_YARDS) / VISUAL_MAX_YARDS, 0, 1);
      targetX = Math.max(targetX, ball.startX + ball.rangeX * ratio);
    }
    crashRollTargetX = Math.min(ball.startX + ball.rangeX, targetX);
    if (Number.isFinite(finalYards)) {
      const clamped = clamp(finalYards, 0, 2000);
      flightState.currentYards = clamped;
      flightState.targetYards = clamped;
    }
    if (flightState.onCrash) flightState.onCrash({ finalYards: flightState.currentYards, crashed:true, xMultiplierAtEnd: flightState.multiplier });
  }catch(err){
    console.error("[flight3d] crashFlight3D error", err);
  }
}

export function onCrashLand(yards){
  crashFlight3D(yards);
}

export function landFlight3D(distanceYards = 0) {
  renderState = "running";
  const yards = clamp(distanceYards, 0, MAX_YARDS);
  setFlightTarget(yards);
  flightState.state = "fly";
  if (flightState.p >= 1) {
    ball.x = ball.startX + flightState.targetRange;
    ball.y = ball.groundY;
    flightState.state = "landed";
    running = false;
    flightState.currentYards = yards;
    if (flightState.onEnd) flightState.onEnd({ finalYards: yards, crashed:false, xMultiplierAtEnd: flightState.multiplier });
  }
}

export function resetFlight3D() {
  try{
    running = false;
    renderState = "idle";
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    resetBall(true);
    render();
  }catch(err){
    console.error("[flight3d] reset error", err);
  }
}

export function getFlightDistanceYards() {
  return clamp(flightState.currentYards, 0, 2000);
}

function clearTrail() {
  if (!trail) return;
  trail.reset();
  if (trailLine) trail.renderSVG(trailLine, camera.x);
}

function detectBounceTransition(ended){
  if(ended && !prevEnded){
    startBounce();
  }
  if(!ended){
    bounceState.active = false;
    bounceState.done = false;
  }
}

function addImpactFx(){
  const visual = computeFlightVisual();
  const frameRight = cssW - 12;
  const fxX = Math.min(worldToScreen(visual.visualX), frameRight);
  const t = performance.now();
  impactFx.push({ t, x: fxX, y: ball.groundY, rings: 0 });
}

function drawImpacts(){
  if(!impactFx.length) return;
  const now = performance.now();
  const ttl = 280;
  for(let i=impactFx.length-1;i>=0;i--){
    const fx = impactFx[i];
    const age = now - fx.t;
    if(age > ttl){ impactFx.splice(i,1); continue; }
    const norm = age / ttl;
    const baseAlpha = 0.35 * (1 - norm);
    for(let r=0;r<3;r++){
      const t = norm + r*0.05;
      if(t>1) continue;
      const radius = 6 + 40 * t;
      ctx.strokeStyle = `rgba(216,200,166,${baseAlpha * (1 - t)})`;
      ctx.lineWidth = 1 + 1.5*(1-t);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI*2);
      ctx.stroke();
    }
  }
}

function drawDust(){
  if(!dustFx.length) return;
  const now = performance.now();
  for(let i=dustFx.length-1;i>=0;i--){
    const fx = dustFx[i];
    const age = now - fx.t;
    if(age > DUST_DURATION){
      dustFx.splice(i,1);
      continue;
    }
    const p = age / DUST_DURATION;
    const scale = 1 + 0.4 * p;
    const alpha = (0.18) * (1 - p);
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(214,206,192,${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, fx.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function drawVignette(){
  const padding = 12;
  const grd = ctx.createRadialGradient(cssW/2, cssH*0.55, cssW*0.2, cssW/2, cssH*0.55, cssW*0.7);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = grd;
  ctx.fillRect(-padding, -padding, cssW + padding*2, cssH + padding*2);
}

function drawScale(fairwayStart, fairwayEnd){
  const yBase = cssH - SCALE_PADDING_BOTTOM;
  const yTickTop = yBase - 18;
  const textY = yBase - 14;
  const markers = [0,100,200,300,350,400,450,500];
  ctx.save();
  ctx.strokeStyle = "rgba(232,236,233,0.55)";
  ctx.fillStyle = "rgba(232,236,233,0.82)";
  ctx.font = "10px 'Inter', system-ui, -apple-system, BlinkMacSystemFont";
  ctx.textBaseline = "top";
  markers.forEach((yard) => {
    const ratio = clamp(yard / VISUAL_MAX_YARDS, 0, 1);
    const worldX = ball.startX + ball.rangeX * ratio;
    const sx = worldToScreen(worldX);
    ctx.lineWidth = yard === 350 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, yTickTop);
    ctx.lineTo(sx, yBase - 6);
    ctx.stroke();
    const alpha = yard > MAX_YARDS ? 0.4 : (yard === 350 ? 0.7 : 0.62);
    ctx.fillStyle = `rgba(232,236,233,${alpha})`;
    ctx.fillText(String(yard), sx - 10, textY);
  });
  ctx.restore();
}

function drawScaleOverlay(){
  const radius = 16;
  const inset = 0;
  ctx.save();
  ctx.beginPath();
  const x = inset;
  const y = inset;
  const w = cssW - inset*2;
  const h = cssH - inset*2;
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const stripHeight = SCALE_HEIGHT * 2;
  const stripGrad = ctx.createLinearGradient(0, cssH - stripHeight, 0, cssH);
  stripGrad.addColorStop(0, "rgba(0,0,0,0)");
  stripGrad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, cssH - stripHeight, cssW, stripHeight);
  drawScale(0, cssW);
  ctx.restore();
}

function drawDebugOverlay(visual){
  const frameTop = 6;
  const frameBottom = cssH - 6;
  const frameRight = cssW - 12;
  const targetScreenX = Math.min(worldToScreen(visual.targetX), frameRight);
  const ballScreenX = visual.screenX;
  ctx.save();
  // Target line
  ctx.strokeStyle = "rgba(255,60,60,0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6,4]);
  ctx.beginPath();
  ctx.moveTo(targetScreenX, frameTop);
  ctx.lineTo(targetScreenX, frameBottom);
  ctx.stroke();
  // Ball line
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(80,200,255,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ballScreenX, frameTop);
  ctx.lineTo(ballScreenX, frameBottom);
  ctx.stroke();

  // HUD text
  const x = 12;
  let y = 10;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "11px 'Inter', system-ui, -apple-system, BlinkMacSystemFont";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const lines = [
    `realYards: ${visual.realYards.toFixed(1)}`,
    `drawYards: ${visual.drawYards.toFixed(1)}`,
    `progress: ${visual.progress.toFixed(3)}`,
    `startX: ${worldToScreen(ball.startX).toFixed(1)}`,
    `targetX: ${targetScreenX.toFixed(1)}`,
    `ballX: ${ballScreenX.toFixed(1)}`
  ];
  lines.forEach((line) => {
    ctx.fillText(line, x, y);
    y += 14;
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r){
  const radius = Math.min(r, w/2, h/2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function computeVisualFit(yards){
  const threshold = 280;
  if(!Number.isFinite(yards) || yards <= threshold) return 1;
  const t = clamp((yards - threshold) / 120, 0, 1);
  return 1 - 0.15 * t;
}

function drawFarFade(){
  const fadeW = cssW * 0.12;
  const grd = ctx.createLinearGradient(cssW - fadeW, 0, cssW, 0);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = grd;
  ctx.fillRect(cssW - fadeW, 0, fadeW, cssH);
}

function drawBadges(dist, inZone, isRecord){
  if(!inZone) return;
  const padding = 12;
  const badgeH = 20;
  const badgeW = 140;
  const x = cssW - badgeW - padding;
  const y = padding + 6;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, x, y, badgeW, badgeH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = "10px 'Inter', system-ui, -apple-system, BlinkMacSystemFont";
  ctx.fillStyle = "rgba(232,236,233,0.78)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("LONG DRIVE ZONE", x + badgeW/2, y + badgeH/2 + 0.5);

  if(isRecord){
    const pillW = 80;
    const pillH = 18;
    const px = x - pillW - 8;
    const py = y + 1;
    ctx.fillStyle = "rgba(216,200,166,0.12)";
    ctx.strokeStyle = "rgba(216,200,166,0.4)";
    ctx.beginPath();
    roundRect(ctx, px, py, pillW, pillH, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(216,200,166,0.9)";
    ctx.fillText("500+ CLUB", px + pillW/2, py + pillH/2 + 0.5);
  }
  ctx.restore();
}

function drawDistanceTags(dist, inZone, isRecord){
  if(!inZone && !isRecord) return;
  const padding = 12;
  const tagH = 18;
  const tagW = isRecord ? 94 : 80;
  const x = padding;
  const y = padding + 6;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, x, y, tagW, tagH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = "10px 'Inter', system-ui, -apple-system, BlinkMacSystemFont";
  ctx.fillStyle = inZone ? "rgba(232,236,233,0.78)" : "rgba(232,236,233,0.6)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(isRecord ? "500+ CLUB" : "LONG DRIVE", x + tagW/2, y + tagH/2 + 0.5);
  ctx.restore();
}

function drawFarHaze(){
  const startYards = 300;
  const startX = yardToScreen(startYards);
  const endX = yardToScreen(VISUAL_MAX_YARDS);
  if(endX <= startX) return;
  const haze = ctx.createLinearGradient(startX, 0, endX, 0);
  haze.addColorStop(0, "rgba(40,54,72,0)");
  haze.addColorStop(1, "rgba(40,54,72,0.22)");
  ctx.fillStyle = haze;
  ctx.fillRect(startX, 0, endX - startX, cssH);
}

function yardToScreen(yards){
  const clamped = clamp(yards, 0, VISUAL_MAX_YARDS);
  const ratio = clamped / VISUAL_MAX_YARDS;
  const worldX = ball.startX + ball.rangeX * ratio;
  return worldToScreen(worldX);
}

function startBounce(){
  if(bounceState.active && !bounceState.done) return;
  bounceState.active = true;
  bounceState.done = false;
  bounceState.start = performance.now();
}

function getBounceOffset(){
  if(!bounceState.active || bounceState.done) return 0;
  const now = performance.now();
  const t = (now - bounceState.start) / BOUNCE_DURATION;
  if(t >= 1){
    bounceState.active = false;
    bounceState.done = true;
    return 0;
  }
  const offset = Math.max(0, BOUNCE_AMP * Math.exp(-BOUNCE_DECAY * t) * Math.abs(Math.sin(BOUNCE_FREQ * t)));
  return offset;
}

function addDustFx(){
  if(dustPlayed) return;
  dustPlayed = true;
  const visual = computeFlightVisual();
  const frameRight = cssW - 12;
  const sx = Math.min(worldToScreen(visual.visualX), frameRight);
  dustFx.push({ t: performance.now(), x: sx, y: ball.groundY, r: Math.max(8, ball.radius * 1.8) });
}

function playImpactSound(){
  try{
    if(!audioCtx){
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtx = Ctor ? new Ctor() : null;
    }
    if(!audioCtx) return;
    const duration = 0.12;
    const sr = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, Math.floor(sr * duration), sr);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){
      const t = i / data.length;
      const env = Math.pow(1 - t, 3);
      data[i] = (Math.random() * 2 - 1) * 0.08 * env;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.1;
    source.connect(gain).connect(audioCtx.destination);
    source.start();
  }catch(err){
    // ignore audio errors
  }
}

function makeNoopEngine(reason = "noop"){
  console.warn("[flight3d] using noop engine", reason);
  const noop = () => {};
  const engine = {
    startFlight3D: noop,
    updateFlight3D: noop,
    crashFlight3D: noop,
    landFlight3D: noop,
    resetFlight3D: noop,
    getFlightDistanceYards: () => 0,
    startFlight: noop,
    crashNow: noop,
    reset: noop,
    isRunning: () => false,
    unsupported: true
  };
  return engine;
}

function runFlightSelfTest(engine){
  if(!engine || typeof engine.startFlight3D !== "function") return;
  let ticked = false;
  let ended = false;
  engine.startFlight({
    targetYards: 50,
    onTick: () => { ticked = true; },
    onEnd: () => { ended = true; }
  });
  setTimeout(() => {
    if(!ticked) console.warn("[flight3d] self-test: no tick");
    if(!ended) console.warn("[flight3d] self-test: no end");
  }, 3000);
}

function fadeTrailSoon() {
  if (!trail) return;
  trail.fadeOut(500);
}
