/**
 * Attack Angle — Realistic Vertical Motion
 * 
 * Visual: club moves VERTICALLY (up = negative angle, down = positive)
 * Pivot at hands (bottom), tiny rotation for angle indication
 * 
 * State machine: IDLE → HOLD → LOCKED (no DOWNSWING animation)
 * On RELEASE: HARD LOCK, no further updates
 */

const CONFIG = {
  // Angle range (degrees) during HOLD oscillation
  MIN_DEG: -4,
  MAX_DEG: 6,
  
  // Sweet window defaults
  WINDOW_CENTER_DEG: 1.0,
  WINDOW_WIDTH_DEG: 2.5,
  
  // Oscillation during HOLD (slow, heavy, physical)
  OSC_SPEED: 1.2,           // base oscillation speed (rad/s) — slower
  OSC_FATIGUE_MULT: 0.15,   // speed increase from fatigue — subtle
  
  // Visual mapping: vertical travel in pixels
  // negative angle (steep) → clubhead lower (positive Y)
  // positive angle (shallow) → clubhead higher (negative Y)
  Y_RANGE_PX: 20,           // total vertical travel range
  
  // Jitter (wind/fatigue)
  JITTER_AMP: 0.04          // amplitude of noise overlay — reduced
};

// Module state
let getStateFn = null;
let isArmingFn = null;
let __aaGeomCache = null;

// Cached DOM elements
let els = {
  container: null,
  meter: null,
  track: null,
  window: null,
  ball: null,
  readout: null,
  driver: null,
  impactLine: null
};

// Simple state machine: IDLE | HOLD | LOCKED
let mode = "IDLE";
let value01 = 0;          // 0 = bottom (impact), 1 = top
let currentDeg = 0;
let lockedDeg = null;
let locked01 = null;
let holdStartTime = 0;

// Internal state defaults for app state
const DEFAULTS = {
  active: false,
  valueDeg: 0,
  locked: false,
  lockedDeg: null,
  windowMinDeg: CONFIG.WINDOW_CENTER_DEG - CONFIG.WINDOW_WIDTH_DEG / 2,
  windowMaxDeg: CONFIG.WINDOW_CENTER_DEG + CONFIG.WINDOW_WIDTH_DEG / 2
};

/**
 * Clamp value between min and max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Format degrees for display
 */
function formatDeg(d) {
  const sign = d >= 0 ? "+" : "−";
  return `${sign}${Math.abs(d).toFixed(1)}°`;
}

function __aaParseDashArray(v) {
  if (!v || v === "none") return null;
  return String(v).split(/[ ,]+/).map(Number).filter(n => Number.isFinite(n));
}

function __aaMod(a, n) {
  return ((a % n) + n) % n;
}

function __aaGetGeom() {
  const plane = document.getElementById("attackAnglePlane") || document.querySelector("#attackAnglePlane, .attack-angle__plane");
  if (!plane) return null;

  const svg = plane.querySelector("svg");
  const ring = plane.querySelector(".aa-ring") || plane.querySelector(".aa-arc");
  if (!svg || !ring || typeof ring.getTotalLength !== "function" || typeof ring.getPointAtLength !== "function") {
    return null;
  }

  const total = ring.getTotalLength();
  const cs = getComputedStyle(ring);
  const da = __aaParseDashArray(cs.strokeDasharray);
  const offRaw = parseFloat(cs.strokeDashoffset || "0") || 0;

  // Determine a SINGLE visible segment length.
  // If dasharray is [dash, gap, ...], assume first number is visible length.
  // If dasharray missing -> fallback to full path length (the arc itself).
  let visLen = null;
  let patternLen = null;

  if (da && da.length >= 2) {
    visLen = da[0];
    patternLen = da.reduce((s, x) => s + x, 0);
  } else if (da && da.length === 1) {
    visLen = da[0];
    patternLen = da[0];
  } else {
    // If the arc is a standalone path (not dashed), the visible segment is the full path length.
    visLen = total;
    patternLen = total;
  }

  // Compute the start of the first dash segment after applying dashoffset.
  // SVG stroke dash starts at path length 0. dashoffset shifts the pattern by offRaw.
  // Start of visible dash is at length = (-dashoffset) mod patternLen.
  // Then map that to the circle length domain.
  const startOnPattern = __aaMod(-offRaw, patternLen);
  // If patternLen differs from total, clamp to circle domain by modulo total.
  const startLen = __aaMod(startOnPattern, total);

  return { plane, svg, ring, total, visLen: Math.min(visLen, total), startLen };
}

function __aaPointOnVisibleArc(t01) {
  // t01 in [0..1] along the visible segment
  if (!__aaGeomCache) __aaGeomCache = __aaGetGeom();
  const g = __aaGeomCache;
  if (!g) return null;

  const t = Math.min(1, Math.max(0, Number.isFinite(t01) ? t01 : 0));
  // shift so t=0.5 is the middle of the visible arc (neutral/0°)
  const phase = g.visLen * 0.5;
  const len = __aaMod(g.startLen + phase + g.visLen * (t - 0.5), g.total);
  const p = g.ring.getPointAtLength(len);

  // Convert SVG user units to screen coords
  const m = g.svg.getScreenCTM();
  if (!m) return null;
  const sp = g.svg.createSVGPoint();
  sp.x = p.x;
  sp.y = p.y;
  const wp = sp.matrixTransform(m);

  const pr = g.plane.getBoundingClientRect();
  return { x: wp.x - pr.left, y: wp.y - pr.top };
}

window.addEventListener("resize", () => { __aaGeomCache = null; }, { passive: true });

/**
 * Get app state
 */
function getState() {
  return typeof getStateFn === "function" ? getStateFn() : null;
}

/**
 * Ensure attackAngle state exists with defaults
 */
function ensureState() {
  const state = getState();
  if (!state) return null;
  
  state.attackAngle = state.attackAngle || {};
  for (const [key, val] of Object.entries(DEFAULTS)) {
    if (!(key in state.attackAngle)) {
      state.attackAngle[key] = val;
    }
  }
  return state;
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  els.container = document.getElementById("attackAngle") 
    || document.querySelector(".attack-angle");
  els.meter = document.getElementById("attackAngleMeter")
    || document.querySelector(".attack-angle__meter");
  els.track = els.meter?.querySelector(".attack-angle__track")
    || document.querySelector(".attack-angle__track");
  els.window = document.getElementById("attackAngleSweet")
    || document.querySelector(".attack-angle__sweet");
  els.ball = document.getElementById("attackAngleRunner")
    || document.querySelector(".attack-angle__runner");
  els.readout = document.getElementById("attackAngleReadout");
  els.driver = document.querySelector(".attack-driver");
  els.impactLine = document.querySelector(".attack-impact-line");
}

/**
 * Render the attack angle UI
 */
function render() {
  const state = ensureState();
  if (!state) return;
  
  const { track, readout } = els;
  
  const aa = state.attackAngle;
  
  // Use locked values if locked, otherwise current
  const displayDeg = mode === "LOCKED" ? lockedDeg : currentDeg;
  const display01 = mode === "LOCKED" ? locked01 : value01;
  
  // Update readout
  if (readout) {
    readout.textContent = formatDeg(displayDeg ?? 0);
  }
  
  // Apply vertical position to driver SVG (no rotation)
  // Mapping: negative angle (steep) → clubhead lower, positive angle (shallow) → clubhead higher
  // Normalize deg to -1..1 range, then scale to pixels
  if (els.driver) {
    const degRange = CONFIG.MAX_DEG - CONFIG.MIN_DEG;
    const normalized = ((displayDeg ?? 0) - CONFIG.MIN_DEG) / degRange; // 0..1
    // Invert: 0 (negative/steep) = down, 1 (positive/shallow) = up
    const yPx = (0.5 - normalized) * CONFIG.Y_RANGE_PX;
    
    els.driver.style.setProperty("--attack-y-px", `${yPx.toFixed(2)}px`);
  }

  // --- ATTACK ANGLE VISUAL CONTRACT ---
  //
  // 0° is defined as the CENTER of the arc (top-most point).
  // This is the neutral aiming position for the player.
  //
  // Angle direction:
  // - Negative degrees move the ball to the LEFT side of the arc
  // - Positive degrees move the ball to the RIGHT side of the arc
  //
  // Visual rules:
  // - The arc itself is static
  // - Only the ball moves along the arc
  // - The ball center always lies exactly on the arc radius
  //
  // WARNING:
  // Changing this mapping will break visual alignment
  // between the arc, the readout, and player intuition.
  //
  // Position runner on the visible arc segment
  if (!__aaGeomCache) __aaGeomCache = __aaGetGeom();
  const runner = els.ball || document.getElementById("attackAngleRunner");
  if (runner) {
    let t = 0.5;
    if (Number.isFinite(displayDeg)) {
      const maxAbs = Math.max(Math.abs(CONFIG.MIN_DEG), Math.abs(CONFIG.MAX_DEG)) || 1;
      // 0° = center of arc
      t = clamp(0.5 + (displayDeg / (2 * maxAbs)), 0, 1);
    } else if (typeof display01 === "number") {
      t = clamp(display01, 0, 1);
    } else if (typeof value01 === "number") {
      t = clamp(value01, 0, 1);
    }

    const pt = __aaPointOnVisibleArc(t);
    if (pt) {
      runner.style.left = pt.x + "px";
      runner.style.top = pt.y + "px";
      if (!runner.style.transform || !runner.style.transform.includes("translate(-50%")) {
        runner.style.transform = "translate(-50%, -50%)";
      }
    }
  }
  
  // Check if inside window and update highlight state
  const deg = displayDeg ?? 0;
  const inside = deg >= aa.windowMinDeg && deg <= aa.windowMaxDeg;
  if (track) {
    track.classList.toggle("attack-angle--inside", inside);
  }
}

/**
 * Initialize the Attack Angle module
 */
export function initAttackAnglePlane(getState, opts = {}) {
  getStateFn = getState;
  isArmingFn = typeof opts.isArming === "function"
    ? opts.isArming
    : (s) => s?.phase === "ARMING";
  
  cacheElements();
  ensureState();
  
  // Add plane-window class to enable styles
  if (els.meter) {
    els.meter.classList.add("attack-angle--plane");
  }
  
  render();
}

/**
 * Update attack angle during arming phase (HOLD)
 * Called every frame while holding
 */
export function updateAttackAnglePlane(ts, dtMs) {
  const state = ensureState();
  if (!state) return;
  
  // HARD LOCK: if locked, do NOTHING
  if (mode === "LOCKED") {
    return;
  }
  
  const now = Number.isFinite(ts) ? ts : performance.now();
  
  // Check if we should be in HOLD mode
  if (!isArmingFn(state)) {
    return;
  }
  
  // Enter HOLD mode if not already
  if (mode !== "HOLD") {
    mode = "HOLD";
    holdStartTime = now;
    value01 = 0;
    currentDeg = 0;
  }
  
  // Calculate elapsed time in seconds
  const elapsed = (now - holdStartTime) * 0.001;
  
  // Get fatigue for speed variation (if available)
  const fatigue = clamp(state.fatigue?.level ?? 0, 0, 1);
  const speed = CONFIG.OSC_SPEED + fatigue * CONFIG.OSC_FATIGUE_MULT;
  
  // Smooth oscillation: sine wave mapped to 0..1
  const phase = elapsed * speed;
  const rawOsc = 0.5 + 0.5 * Math.sin(phase);
  
  // Add subtle jitter (wind/fatigue noise)
  const jitter = Math.sin(elapsed * 7.3) * CONFIG.JITTER_AMP * (0.5 + fatigue * 0.5);
  value01 = clamp(rawOsc + jitter, 0, 1);
  
  // Map value01 to degrees: 0 = MIN_DEG (bottom), 1 = MAX_DEG (top)
  currentDeg = CONFIG.MIN_DEG + value01 * (CONFIG.MAX_DEG - CONFIG.MIN_DEG);
  
  // Update app state
  state.attackAngle.active = true;
  state.attackAngle.locked = false;
  state.attackAngle.valueDeg = currentDeg;
  
  render();
}

/**
 * Lock the current attack angle value - HARD LOCK
 * Called on release
 */
export function lockAttackAnglePlane() {
  const state = ensureState();
  if (!state) return;
  
  // Already locked? Do nothing
  if (mode === "LOCKED") {
    return;
  }
  
  // HARD LOCK: capture current values
  lockedDeg = currentDeg;
  locked01 = value01;
  mode = "LOCKED";
  
  // Update app state
  state.attackAngle.locked = true;
  state.attackAngle.lockedDeg = lockedDeg;
  
  render();
}

/**
 * Reset attack angle to initial state
 */
export function resetAttackAnglePlane() {
  const state = ensureState();
  if (!state) return;
  
  // Reset state machine
  mode = "IDLE";
  value01 = 0;
  currentDeg = 0;
  lockedDeg = null;
  locked01 = null;
  holdStartTime = 0;
  __aaGeomCache = null;
  
  // Reset app state
  state.attackAngle.active = false;
  state.attackAngle.valueDeg = 0;
  state.attackAngle.locked = false;
  state.attackAngle.lockedDeg = null;
  
  render();
}

/**
 * Get the current attack angle value in degrees
 */
export function getAttackAngleValue() {
  const state = ensureState();
  if (!state) return 0;
  
  return state.attackAngle.locked 
    ? state.attackAngle.lockedDeg 
    : state.attackAngle.valueDeg;
}

/**
 * Check if current angle is inside the acceptable window
 */
export function isInsideAttackWindow() {
  const state = ensureState();
  if (!state) return false;
  
  const deg = getAttackAngleValue();
  const { windowMinDeg, windowMaxDeg } = state.attackAngle;
  
  return deg >= windowMinDeg && deg <= windowMaxDeg;
}

/**
 * Set custom window range
 */
export function setAttackWindow(centerDeg, widthDeg) {
  const state = ensureState();
  if (!state) return;
  
  state.attackAngle.windowMinDeg = centerDeg - widthDeg / 2;
  state.attackAngle.windowMaxDeg = centerDeg + widthDeg / 2;
  
  render();
}

/**
 * Get current mode (for debugging)
 */
export function getAttackMode() {
  return mode;
}

// Re-export render for external use if needed
export { render as renderAttackAnglePlane };
