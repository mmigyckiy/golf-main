/**
 * Shared math utilities for Drivix
 * Consolidated from: rng.js, swing_path.js, swing_controls.js, 
 * attack_angle.js, flight_aviatorlike.js, golfMath.js
 */

// Re-export core functions from rng.js for compatibility
export { clamp, clamp01, randInt, randn, pickWeighted } from '../logic/rng.js';

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Ease out cubic curve
 * @param {number} t - Input value (0-1)
 * @returns {number}
 */
export function easeOutCubic(t) {
  const c = Math.min(1, Math.max(0, t));
  const inv = 1 - c;
  return 1 - inv * inv * inv;
}

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param {number} rad - Radians
 * @returns {number} Degrees
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Calculate cartesian coordinates from polar (using degrees)
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} deg - Angle in degrees
 * @returns {{x: number, y: number}}
 */
export function polarToCartesianDeg(cx, cy, r, deg) {
  const rad = degToRad(deg);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

/**
 * Calculate cartesian coordinates from polar (using radians)
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} angleRad - Angle in radians
 * @returns {{x: number, y: number}}
 */
export function polarToCartesianRad(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}

/**
 * Generate SVG arc path descriptor (using degrees)
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} startDeg - Start angle in degrees
 * @param {number} endDeg - End angle in degrees
 * @returns {string} SVG path "d" attribute
 */
export function describeArcDeg(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesianDeg(cx, cy, r, startDeg);
  const end = polarToCartesianDeg(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * Generate SVG arc path descriptor (using radians)
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @returns {string} SVG path "d" attribute
 */
export function describeArcRad(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesianRad(cx, cy, r, startAngle);
  const end = polarToCartesianRad(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * Safe clamp01 that handles non-finite values
 * @param {number} v - Value to clamp
 * @returns {number}
 */
export function safeClamp01(v) {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
}
