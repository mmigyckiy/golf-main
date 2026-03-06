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

/** Sweet zone arc segment between t0 and t1. */
function sweetArcPath(t0, t1) {
  const [sx, sy] = ptAtT(t0);
  const [ex, ey] = ptAtT(t1);
  const large = ((t1 - t0) * SWEEP_DEG > 180) ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${RING_R} ${RING_R} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
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
  let fillEl  = null;
  let tipEl   = null;
  let _t = 0;

  function _render(t) {
    _t = Math.max(0, Math.min(1, t));
    if (!svgRoot) return;
    fillEl.setAttribute("d", fillPath(_t));
    if (tipEl) {
      const [tx, ty] = ptAtT(_t);
      tipEl.setAttribute("cx", tx.toFixed(2));
      tipEl.setAttribute("cy", ty.toFixed(2));
      tipEl.style.display = _t <= 0.005 ? "none" : "";
    }
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

    // ── defs: linear gradient dim-bottom → bright-top ──
    const defs = document.createElementNS(SVG_NS, "defs");
    const grad = mkSvg("linearGradient", {
      id: "twFillGrad", x1: "0", y1: "1", x2: "0", y2: "0",
      gradientUnits: "objectBoundingBox"
    });
    grad.appendChild(mkSvg("stop", { offset: "0%",   "stop-color": "rgba(0,245,255,0.30)" }));
    grad.appendChild(mkSvg("stop", { offset: "60%",  "stop-color": "rgba(0,245,255,0.70)" }));
    grad.appendChild(mkSvg("stop", { offset: "100%", "stop-color": "#00F5FF" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // ── background track (full 270° dim ring) ──
    svg.appendChild(mkSvg("path", {
      d:                trackPath(),
      class:            "tempoRing__track",
      fill:             "none",
      stroke:           "rgba(0,245,255,0.10)",
      "stroke-width":   "7",
      "stroke-linecap": "round"
    }));

    // ── sweet zone arc (60%–80%) ──
    svg.appendChild(mkSvg("path", {
      d:                sweetArcPath(SWEET_LO, SWEET_HI),
      class:            "tempoRing__sweet",
      fill:             "none",
      stroke:           "rgba(0,245,255,0.22)",
      "stroke-width":   "7",
      "stroke-linecap": "round"
    }));

    // ── dynamic fill arc ──
    fillEl = mkSvg("path", {
      d:                "",
      class:            "tempoRing__fill",
      fill:             "none",
      stroke:           "url(#twFillGrad)",
      "stroke-width":   "8",
      "stroke-linecap": "round"
    });
    svg.appendChild(fillEl);

    // ── tip dot (follows progress along ring) ──
    tipEl = mkSvg("circle", {
      cx: "0", cy: "0", r: "5",
      class:   "tempoRing__tip",
      fill:    "#00F5FF",
      stroke:  "none",
      display: "none"
    });
    svg.appendChild(tipEl);

    // ── scale labels: 0 / 50 / 100 at start, top, end ──
    const labelDefs = [[0, "0"], [0.5, "50"], [1, "100"]];
    labelDefs.forEach(([t, text]) => {
      const [lx, ly] = ptAtT(t);
      // Nudge labels away from the arc ends / off the top
      const offX = t === 0 ? -10 : t === 1 ? 6 : 0;
      const offY = (t === 0 || t === 1) ? 4 : -6;
      const label = mkSvg("text", {
        x:                (lx + offX).toFixed(1),
        y:                (ly + offY).toFixed(1),
        class:            "tempoWedge__label",
        "font-size":      "9",
        "text-anchor":    t === 0 ? "end" : t === 1 ? "start" : "middle",
        "letter-spacing": "0.08em"
      });
      label.textContent = text;
      svg.appendChild(label);
    });

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
    wrapEl = null; svgRoot = null; fillEl = null; tipEl = null;
  }

  return { mount, setProgress01, setRunner01, setState, reset, destroy };
}
