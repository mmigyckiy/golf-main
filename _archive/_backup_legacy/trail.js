"use strict";

class Trail {
  constructor(maxPoints = 140, minDistPx = 6) {
    this.maxPoints = maxPoints;
    this.minDist = minDistPx;
    this.points = [];
    this.fadeUntil = 0;
    this.fadeStart = 0;
  }

  reset() {
    this.points = [];
    this.fadeUntil = 0;
    this.fadeStart = 0;
  }

  addPoint(xPx, yPx, timeMs = performance.now()) {
    if (!Number.isFinite(xPx) || !Number.isFinite(yPx)) return;
    const last = this.points[this.points.length - 1];
    if (last) {
      const dx = xPx - last.x;
      const dy = yPx - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.minDist) return;
    }
    this.points.push({ x: xPx, y: yPx });
    if (this.points.length > this.maxPoints) this.points.shift();
    // reset fade on new point
    this.fadeUntil = 0;
    this.fadeStart = 0;
  }

  fadeOut(durationMs = 500) {
    const now = performance.now();
    this.fadeStart = now;
    this.fadeUntil = now + Math.max(0, durationMs);
  }

  renderSVG(polylineEl, cameraXpx = 0) {
    if (!polylineEl || typeof polylineEl.setAttribute !== "function") return;
    const now = performance.now();
    let opacity = 1;
    if (this.fadeUntil && now >= this.fadeStart) {
      const t = Math.min(1, (now - this.fadeStart) / Math.max(1, this.fadeUntil - this.fadeStart));
      opacity = 1 - t;
      if (opacity < 0) opacity = 0;
      if (now >= this.fadeUntil) {
        // Finish fade by clearing
        this.reset();
      }
    }
    const pts = this.points.map(p => `${(p.x - cameraXpx).toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    polylineEl.setAttribute("points", pts);
    polylineEl.style.opacity = opacity.toString();
  }
}

if (typeof window !== "undefined") {
  window.Trail = Trail;
}

export { Trail };
