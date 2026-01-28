/**
 * Attack Angle — Plane Window Variant
 * 
 * Visual metaphor:
 * - Ball fixed at center (impact point)
 * - Thin rotating line represents club attack angle
 * - Tilted rectangular "window" shows acceptable angle range
 * - Subtle 0° reference line
 * 
 * During ARMING: angle oscillates smoothly
 * On RELEASE: angle locks, evaluate if inside window
 */

const PLANE_CONFIG = {
  // Angle range for oscillation (degrees)
  MIN_DEG: -6,
  MAX_DEG: 6,
  
  // Default sweet window
  WINDOW_CENTER_DEG: 1.5,
  WINDOW_WIDTH_DEG: 3.0,
  
  // Oscillation speed (radians per second base)
  OSC_SPEED_BASE: 1.4,
  OSC_SPEED_FATIGUE_MULT: 0.35,
  
  // Visual rotation multiplier (for more visible movement)
  VISUAL_MULT: 6
};

// Module state
let getStateFn = null;
let isArmingFn = null;

// Cached DOM elements
let els = {
  container: null,
  meter: null,
  track: null,
  line: null,      // rotating attack line (we'll create via CSS pseudo or reuse track::before)
  window: null,    // the acceptable window (sweet)
  ball: null,      // fixed ball (runner)
  readout: null
};

// Internal state defaults
const DEFAULTS = {
  active: false,
  valueDeg: 0,
  locked: false,
  lockedDeg: null,
  windowMinDeg: PLANE_CONFIG.WINDOW_CENTER_DEG - PLANE_CONFIG.WINDOW_WIDTH_DEG / 2,
  windowMaxDeg: PLANE_CONFIG.WINDOW_CENTER_DEG + PLANE_CONFIG.WINDOW_WIDTH_DEG / 2
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
}

/**
 * Render the attack angle UI
 */
function render() {
  const state = ensureState();
  if (!state) return;
  
  const { track, window: windowEl, ball, readout } = els;
  if (!track || !readout) return;
  
  const aa = state.attackAngle;
  const deg = aa.locked ? aa.lockedDeg : aa.valueDeg;
  
  // Update readout
  readout.textContent = formatDeg(deg);
  
  // Set CSS variable for rotating line (multiply for visual effect)
  const visualDeg = clamp(deg, PLANE_CONFIG.MIN_DEG, PLANE_CONFIG.MAX_DEG) * PLANE_CONFIG.VISUAL_MULT;
  track.style.setProperty("--attack-line-deg", `${visualDeg}deg`);
  
  // Check if inside window and update highlight state
  const inside = deg >= aa.windowMinDeg && deg <= aa.windowMaxDeg;
  track.classList.toggle("attack-angle--inside", inside);
  
  // Position the window indicator (convert window center/width to visual rotation)
  if (windowEl) {
    const windowCenterDeg = (aa.windowMinDeg + aa.windowMaxDeg) / 2;
    const windowWidthDeg = aa.windowMaxDeg - aa.windowMinDeg;
    const visualCenter = windowCenterDeg * PLANE_CONFIG.VISUAL_MULT;
    const visualWidth = windowWidthDeg * PLANE_CONFIG.VISUAL_MULT;
    
    windowEl.style.setProperty("--window-center-deg", `${visualCenter}deg`);
    windowEl.style.setProperty("--window-width-deg", `${visualWidth}deg`);
  }
}

/**
 * Initialize the Attack Angle Plane module
 * @param {Function} getStateFn - Function to get app state
 * @param {Object} opts - Options
 * @param {Function} opts.isArming - Function to check if in arming phase
 */
export function initAttackAnglePlane(getState, opts = {}) {
  getStateFn = getState;
  isArmingFn = typeof opts.isArming === "function"
    ? opts.isArming
    : (s) => s?.phase === "ARMING";
  
  cacheElements();
  ensureState();
  
  // Add plane-window class to enable new styles
  if (els.meter) {
    els.meter.classList.add("attack-angle--plane");
  }
  
  render();
}

/**
 * Update attack angle during arming phase
 * Called every frame while holding
 * @param {number} ts - Current timestamp
 * @param {number} dtMs - Delta time in ms
 */
export function updateAttackAnglePlane(ts, dtMs) {
  const state = ensureState();
  if (!state || !isArmingFn(state)) return;
  
  const now = Number.isFinite(ts) ? ts : performance.now();
  const t0 = state.timestamps?.holdStartMs ?? now;
  const elapsed = Math.max(0, (now - t0) * 0.001); // seconds
  
  // Get fatigue for speed variation
  const fatigue = clamp(state.fatigue?.level ?? 0, 0, 1);
  const speed = PLANE_CONFIG.OSC_SPEED_BASE + fatigue * PLANE_CONFIG.OSC_SPEED_FATIGUE_MULT;
  
  // Smooth oscillation using sine wave
  const phase = elapsed * speed;
  const normalized = 0.5 + 0.5 * Math.sin(phase); // 0 to 1
  
  // Map to degree range
  const deg = PLANE_CONFIG.MIN_DEG + (PLANE_CONFIG.MAX_DEG - PLANE_CONFIG.MIN_DEG) * normalized;
  
  state.attackAngle.active = true;
  state.attackAngle.locked = false;
  state.attackAngle.valueDeg = deg;
  
  render();
}

/**
 * Lock the current attack angle value
 * Called on release
 */
export function lockAttackAnglePlane() {
  const state = ensureState();
  if (!state) return;
  
  state.attackAngle.locked = true;
  state.attackAngle.lockedDeg = state.attackAngle.valueDeg;
  
  render();
}

/**
 * Reset attack angle to initial state
 */
export function resetAttackAnglePlane() {
  const state = ensureState();
  if (!state) return;
  
  state.attackAngle.active = false;
  state.attackAngle.valueDeg = 0;
  state.attackAngle.locked = false;
  state.attackAngle.lockedDeg = null;
  
  render();
}

/**
 * Get the current attack angle value in degrees
 * @returns {number} Current angle in degrees
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
 * @returns {boolean} True if inside window
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
 * @param {number} centerDeg - Center of window in degrees
 * @param {number} widthDeg - Width of window in degrees
 */
export function setAttackWindow(centerDeg, widthDeg) {
  const state = ensureState();
  if (!state) return;
  
  state.attackAngle.windowMinDeg = centerDeg - widthDeg / 2;
  state.attackAngle.windowMaxDeg = centerDeg + widthDeg / 2;
  
  render();
}

// Re-export render for external use if needed
export { render as renderAttackAnglePlane };
