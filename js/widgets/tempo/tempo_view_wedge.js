// ============================================================
// Swing Tempo — Wedge View (↗ ramp)
// ============================================================
// A right-angle triangle that fills from the acute bottom-left
// corner rightward and upward as tempo increases 0 → 1.
//
// tempo01 = 0.0 → empty (acute angle at bottom-left)
// tempo01 = 1.0 → full triangle filled (top-right reached)
//
// Geometry (SVG user units, viewBox 0 0 120 110):
//   P_acute    = (L, B) = (4, 106)  ← bottom-left (acute angle, 0%)
//   P_botright = (R, B) = (90, 106) ← bottom-right (right angle)
//   P_topright = (R, T) = (90, 4)   ← top-right (100%)
//   Hypotenuse: P_acute → P_topright ← fill boundary
// ============================================================

const SVG_NS   = "http://www.w3.org/2000/svg";
const VB_W     = 120;
const VB_H     = 110;
const L        = 4;    // left x  (acute angle)
const R        = 90;   // right x (right angle + top corner share this column)
const T        = 4;    // top y
const B        = 106;  // bottom y
const SWEET_LO = 0.60;
const SWEET_HI = 0.80;

// ── geometry helpers ─────────────────────────────────────────

/**
 * Point on hypotenuse at progress t.
 * t=0 → P_acute (L,B) bottom-left   (0%  — sharp tip)
 * t=1 → P_topright (R,T) top-right  (100% — wide end)
 */
function hypAt(t) {
  return [L + t * (R - L), B + t * (T - B)];
  // = [4 + 86t,  106 - 102t]
}

/**
 * Fill path at progress t.
 * Triangle: P_acute → bottom-edge-to-hx → hyp-point → close.
 */
function fillPath(t) {
  if (t <= 0.001) return "";
  const [hx, hy] = hypAt(t);
  return `M ${L} ${B} L ${hx.toFixed(2)} ${B} L ${hx.toFixed(2)} ${hy.toFixed(2)} Z`;
}

/** Sweet zone polygon between two progress values */
function sweetPath(t0, t1) {
  const [x0, y0] = hypAt(t0);
  const [x1, y1] = hypAt(t1);
  // Band bounded by hyp on top, bottom edge on bottom, verticals on sides
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x0.toFixed(2)} ${B} L ${x1.toFixed(2)} ${B} L ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
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
  let _t = 0;

  function _render(t) {
    _t = Math.max(0, Math.min(1, t));
    if (!svgRoot) return;
    fillEl.setAttribute("d", fillPath(_t));
  }

  // ── mount ───────────────────────────────────────────────────
  function mount(container) {
    if (!container || wrapEl) return;

    wrapEl = document.createElement("div");
    wrapEl.className = "tempoWedge";

    const svg = mkSvg("svg", {
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      class:   "tempoWedge__svg is-idle",
      role:    "img",
      "aria-label":        "Swing tempo power",
      preserveAspectRatio: "xMidYMid meet"
    });
    svgRoot = svg;

    // ── defs: fill gradient (bottom → top = dim → bright) ──
    const defs = document.createElementNS(SVG_NS, "defs");
    const grad = mkSvg("linearGradient", {
      id: "twFillGrad", x1: "0", y1: "1", x2: "0", y2: "0",
      gradientUnits: "objectBoundingBox"
    });
    grad.appendChild(mkSvg("stop", { offset: "0%",   "stop-color": "rgba(216,200,166,0.10)"  }));
    grad.appendChild(mkSvg("stop", { offset: "60%",  "stop-color": "rgba(216,200,166,0.28)" }));
    grad.appendChild(mkSvg("stop", { offset: "100%", "stop-color": "rgba(216,200,166,0.50)" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // ── background triangle (full wedge outline) ──
    // Vertices: P_acute(L,B) — P_botright(R,B) — P_topright(R,T)
    svg.appendChild(mkSvg("polygon", {
      points: `${L},${B} ${R},${B} ${R},${T}`,
      class:  "tempoWedge__bg",
      fill:   "rgba(216,200,166,0.04)",
      stroke: "rgba(216,200,166,0.30)",
      "stroke-width":    "0.9",
      "stroke-linejoin": "round"
    }));

    // ── sweet zone fill (60–80%) ──
    svg.appendChild(mkSvg("path", {
      d:      sweetPath(SWEET_LO, SWEET_HI),
      class:  "tempoWedge__sweet",
      fill:   "rgba(216,200,166,0.12)",
      stroke: "none"
    }));

    // ── sweet zone dashed boundary lines (vertical) ──
    [SWEET_LO, SWEET_HI].forEach(t => {
      const [hx, hy] = hypAt(t);
      svg.appendChild(mkSvg("line", {
        x1: hx.toFixed(2), y1: B,
        x2: hx.toFixed(2), y2: hy.toFixed(2),
        class:              "tempoWedge__sweetEdge",
        stroke:             "rgba(216,200,166,0.32)",
        "stroke-width":     "0.7",
        "stroke-dasharray": "2.5 2"
      }));
    });

    // ── dynamic fill ──
    fillEl = mkSvg("path", {
      d:      "",
      class:  "tempoWedge__fill",
      fill:   "url(#twFillGrad)",
      stroke: "none"
    });
    svg.appendChild(fillEl);

    // ── hypotenuse edge (crisp diagonal, drawn over fill) ──
    svg.appendChild(mkSvg("line", {
      x1: L, y1: B, x2: R, y2: T,
      class:            "tempoWedge__hyp",
      stroke:           "rgba(216,200,166,0.88)",
      "stroke-width":   "1.6",
      "stroke-linecap": "round"
    }));

    // ── scale labels (right side) ──
    [["100", 1], ["50", 0.5], ["0", 0]].forEach(([text, t]) => {
      const y = B + t * (T - B);
      const labelEl = mkSvg("text", {
        x:               R + 4,
        y:               (y + 3.5).toFixed(1),
        class:           "tempoWedge__label",
        "font-size":     "9",
        "letter-spacing": "0.08em"
      });
      labelEl.textContent = text;
      svg.appendChild(labelEl);
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
    wrapEl = null; svgRoot = null; fillEl = null;
  }

  return { mount, setProgress01, setRunner01, setState, reset, destroy };
}
