// ============================================================
// Swing Tempo — Wedge View
// ============================================================
// A right-angle triangle (wedge / ramp) that fills from the
// acute bottom-right corner upward to the top-left as tempo
// increases 0 → 1.
//
// tempo01 = 0.0 → empty (acute angle at bottom-right)
// tempo01 = 1.0 → full triangle filled (top-left reached)
//
// Geometry (SVG user units, viewBox 0 0 120 110):
//   P_topleft = (L, T) = (4, 4)    ← top-left corner
//   P_topright = (R, T) = (90, 4)  ← top-right corner (right angle)
//   P_acute   = (R, B) = (90, 106) ← bottom-right (acute angle, 0%)
//   Hypotenuse: P_topleft → P_acute ← fill boundary
// ============================================================

const SVG_NS   = "http://www.w3.org/2000/svg";
const VB_W     = 120;
const VB_H     = 110;
const L        = 4;    // left x
const R        = 90;   // right x  (right angle + acute angle share this column)
const T        = 4;    // top y
const B        = 106;  // bottom y (acute angle)
const SWEET_LO = 0.60;
const SWEET_HI = 0.80;

// ── geometry helpers ─────────────────────────────────────────

/**
 * Point on hypotenuse at progress t.
 * t=0 → P_acute (R,B) bottom-right   (0%  — sharp tip)
 * t=1 → P_topleft (L,T) top-left     (100% — wide end)
 */
function hypAt(t) {
  return [R + t * (L - R), B + t * (T - B)];
  // = [90 - 86t,  106 - 102t]
}

/**
 * Fill path at progress t.
 * Polygon: P_acute → right-edge-up-to-ry → hyp-point-at-ry → close via hyp.
 * The closing edge lies exactly on the hypotenuse.
 */
function fillPath(t) {
  if (t <= 0.001) return "";
  const [hx, hy] = hypAt(t);   // point on hyp = same y as right-edge cut
  const ry = hy;                // right-edge y at progress t
  return `M ${R} ${B} L ${R} ${ry.toFixed(2)} L ${hx.toFixed(2)} ${ry.toFixed(2)} Z`;
}

/** Sweet zone polygon between two progress values */
function sweetPath(t0, t1) {
  const [x0, y0] = hypAt(t0);
  const [x1, y1] = hypAt(t1);
  // Band between the two horizontal levels (bounded left by hyp, right by right edge)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${R} ${y0.toFixed(2)} L ${R} ${y1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
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
    // Vertices: P_topleft(L,T) — P_topright(R,T) — P_acute(R,B)
    svg.appendChild(mkSvg("polygon", {
      points: `${L},${T} ${R},${T} ${R},${B}`,
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

    // ── sweet zone dashed boundary lines ──
    [SWEET_LO, SWEET_HI].forEach(t => {
      const [hx, hy] = hypAt(t);
      svg.appendChild(mkSvg("line", {
        x1: hx.toFixed(2), y1: hy.toFixed(2),
        x2: R,             y2: hy.toFixed(2),
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
      x1: L, y1: T, x2: R, y2: B,
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
