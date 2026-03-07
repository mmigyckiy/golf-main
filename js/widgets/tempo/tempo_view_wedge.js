// ============================================================
// Swing Tempo — Ring View (Option D: Neon Arc Ring)
// ============================================================
// A 270° circular arc that fills clockwise as tempo increases
// 0 → 1. Start: bottom-left (225° from 12 o'clock), sweeps up
// through the top, ending at bottom-right (135°).
//
// tempo01 = 0.0 → empty ring (tip hidden)
// tempo01 = 1.0 → full 270° arc lit
//
// Geometry (SVG user units, viewBox 0 0 140 110):
//   Center   = (CX=70, CY=58)
//   Radius   = 46
//   Start    = 225° clockwise from top → (37.47, 90.53)
//   End      = 135° clockwise from top → (102.53, 90.53)
//   Sweet    = 60%–80% of arc
//
// Public API (unchanged): mount / setProgress01 / setRunner01 /
//                         setState / reset / destroy
// ============================================================

const SVG_NS    = "http://www.w3.org/2000/svg";
const VB_W      = 140;
const VB_H      = 110;
const CX        = 70;
const CY        = 58;
const RING_R    = 46;
const START_DEG = 225;   // start angle clockwise from 12 o'clock
const SWEEP_DEG = 270;   // total sweep (→ ends at 135°)
const SWEET_LO  = 0.60;
const SWEET_HI  = 0.80;
const N_SEGS    = 10;    // number of power bar segments
const SEG_DEG   = 23;    // arc degrees per segment
const GAP_DEG   = 4;     // gap degrees between segments  (10×23 + 10×4 = 270 ✓)

// ── geometry helpers ─────────────────────────────────────────

function toRad(deg) { return deg * Math.PI / 180; }

/**
 * SVG coordinate on the ring at progress t (0 = start, 1 = end).
 * Angles measured clockwise from 12 o'clock (top).
 */
function ptAtT(t) {
  const a = START_DEG + t * SWEEP_DEG;
  return [
    CX + RING_R * Math.sin(toRad(a)),
    CY - RING_R * Math.cos(toRad(a))
  ];
}

/**
 * SVG arc path string from ring start to progress t.
 * Returns "" when t ≤ 0.
 */
function fillPath(t) {
  if (t <= 0.001) return "";
  const [sx, sy] = ptAtT(0);
  const [ex, ey] = ptAtT(t);
  const large = (t * SWEEP_DEG > 180) ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${RING_R} ${RING_R} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/** Full 270° track arc (background ring). */
function trackPath() {
  const [sx, sy] = ptAtT(0);
  const [ex, ey] = ptAtT(1);
  // 270° > 180° → large-arc-flag = 1
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${RING_R} ${RING_R} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/** Arc path for power-bar segment i (SEG_DEG wide, GAP_DEG spacing). */
function segPath(i) {
  const t0 = (i * (SEG_DEG + GAP_DEG)) / SWEEP_DEG;
  const t1 = (i * (SEG_DEG + GAP_DEG) + SEG_DEG) / SWEEP_DEG;
  const [sx, sy] = ptAtT(t0);
  const [ex, ey] = ptAtT(t1);
  // SEG_DEG=23 < 180 → large-arc-flag always 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${RING_R} ${RING_R} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function mkSvg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ── factory ──────────────────────────────────────────────────

export function createTempoViewWedge() {
  let wrapEl  = null;
  let svgRoot = null;
  let segEls  = [];
  let _t = 0;

  function _render(t) {
    _t = Math.max(0, Math.min(1, t));
    if (!svgRoot) return;
    segEls.forEach((el, i) => {
      el.classList.toggle("is-active", i < _t * N_SEGS);
    });
  }

  // ── mount ───────────────────────────────────────────────────
  function mount(container) {
    if (!container || wrapEl) return;

    wrapEl = document.createElement("div");
    wrapEl.className = "tempoWedge";   // reused — CSS wrapper rules still apply

    const svg = mkSvg("svg", {
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      class:   "tempoWedge__svg is-idle",
      role:    "img",
      "aria-label":        "Swing tempo power",
      preserveAspectRatio: "xMidYMid meet"
    });
    svgRoot = svg;

    // ── background track (full 270° dim base — "empty bar") ──
    svg.appendChild(mkSvg("path", {
      d:                trackPath(),
      class:            "tempoRing__track",
      fill:             "none",
      stroke:           "rgba(0,245,255,0.08)",
      "stroke-width":   "8",
      "stroke-linecap": "butt"
    }));

    // ── power bar segments — flat ends so gaps read as dividers in the track ──
    segEls = [];
    for (let i = 0; i < N_SEGS; i++) {
      const isSweet = (i >= 6 && i <= 7);
      const seg = mkSvg("path", {
        d:                segPath(i),
        class:            "tempoRing__seg" + (isSweet ? " tempoRing__seg--sweet" : ""),
        fill:             "none",
        stroke:           "rgba(0,245,255,0.12)",
        "stroke-width":   "8",
        "stroke-linecap": "butt"
      });
      svg.appendChild(seg);
      segEls.push(seg);
    }

    // ── power button group (carries 3D press animation) ──────
    const btnGroup = document.createElementNS(SVG_NS, "g");
    btnGroup.setAttribute("class", "tempoBtn__group");

    btnGroup.appendChild(mkSvg("circle", {
      cx:    String(CX),
      cy:    String(CY),
      r:     "28",
      class: "tempoBtn__bg"
    }));

    // ── golf club (driver): steep diagonal shaft + wide pill head ──
    btnGroup.appendChild(mkSvg("path", {
      d: [
        `M ${CX-16} ${CY-11} L ${CX-7} ${CY+4}`,
        `M ${CX-7} ${CY+4}`,
        `L ${CX+12} ${CY+4}`,
        `Q ${CX+17} ${CY+4} ${CX+17} ${CY+9}`,
        `Q ${CX+17} ${CY+13} ${CX+12} ${CY+13}`,
        `L ${CX-7} ${CY+13}`,
        `Q ${CX-11} ${CY+13} ${CX-11} ${CY+9}`,
        `Q ${CX-11} ${CY+4} ${CX-7} ${CY+4} Z`
      ].join(" "),
      class: "tempoBtn__symbol"
    }));

    // 3D press events
    const _press   = () => btnGroup.classList.add("is-pressed");
    const _release = () => btnGroup.classList.remove("is-pressed");
    btnGroup.addEventListener("mousedown",   _press);
    btnGroup.addEventListener("touchstart",  _press,   { passive: true });
    btnGroup.addEventListener("mouseup",     _release);
    btnGroup.addEventListener("mouseleave",  _release);
    btnGroup.addEventListener("touchend",    _release);
    btnGroup.addEventListener("touchcancel", _release);

    svg.appendChild(btnGroup);

    wrapEl.appendChild(svg);
    container.appendChild(wrapEl);
    _render(0);
  }

  // ── public API ───────────────────────────────────────────────

  function setProgress01(v) { _render(Number(v) || 0); }
  function setRunner01(v)   { /* same as progress for tempo */ }

  function setState(state) {
    if (!svgRoot) return;
    svgRoot.classList.remove("is-idle", "is-active", "is-hold", "is-locked");
    svgRoot.classList.add(`is-${String(state || "idle").toLowerCase()}`);
  }

  function reset() {
    setState("idle");
    _render(0);
  }

  function destroy() {
    if (wrapEl?.parentElement) wrapEl.remove();
    wrapEl = null; svgRoot = null; segEls = [];
  }

  return { mount, setProgress01, setRunner01, setState, reset, destroy };
}
