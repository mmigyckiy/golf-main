// ============================================================
// Swing Path — Pendulum Sector View (Variant A)
// ============================================================
// A needle anchored at the bottom-centre pivot sweeps ±20° from
// vertical, leaving a filled sector "radar trace" between the
// centre line and the current heading.
//
// path01 = 0.5  → centre (0°)
// path01 = 0.0  → full left  (−20°)
// path01 = 1.0  → full right (+20°)
// ============================================================

const SVG_NS = "http://www.w3.org/2000/svg";

// ── geometry ──────────────────────────────────────────────
const VB_W    = 120;   // viewBox width
const VB_H    = 82;    // viewBox height
const PX      = 60;    // pivot x
const PY      = 76;    // pivot y
const NEEDLE  = 60;    // needle length
const ARC_R   = 58;    // outer arc / scale radius
const MAX_DEG = 20;    // ± max sweep angle
const SWEET   = 5;     // ± sweet-zone half-width

// ── helpers ───────────────────────────────────────────────
function rad(d) { return d * Math.PI / 180; }

/** Cartesian tip position at (deg from vertical, radius r) from pivot */
function tipAt(deg, r) {
  return [
    PX + r * Math.sin(rad(deg)),
    PY - r * Math.cos(rad(deg))
  ];
}

/** Filled sector path from angle a to angle b (pivot → arc → pivot) */
function sectorPath(a, b) {
  if (Math.abs(b - a) < 0.01) return "";
  const [x1, y1] = tipAt(a, ARC_R);
  const [x2, y2] = tipAt(b, ARC_R);
  const large = Math.abs(b - a) > 180 ? 1 : 0;
  const sweep = b > a ? 1 : 0;
  return (
    `M ${PX} ${PY} ` +
    `L ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${ARC_R} ${ARC_R} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
  );
}

/** Open arc path from angle a to angle b (no fill, no close) */
function arcPath(a, b) {
  const [x1, y1] = tipAt(a, ARC_R);
  const [x2, y2] = tipAt(b, ARC_R);
  const large = Math.abs(b - a) > 180 ? 1 : 0;
  const sweep = b > a ? 1 : 0;
  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${ARC_R} ${ARC_R} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`
  );
}

/** Create SVG element with attributes */
function mkSvg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ── factory ───────────────────────────────────────────────
export function createPathViewSector() {
  let wrapEl   = null;   // #alignmentRing container div
  let svgRoot  = null;   // <svg>
  let fillEl   = null;   // dynamic sector fill
  let needleEl = null;   // needle <line>
  let tipEl    = null;   // needle tip <circle>
  let gradFill = null;   // gradient stop (unlocked tint)
  let gradFillLocked = null; // gradient stop (locked tint)
  let _locked  = false;
  let _deg     = 0;
  let _popTimer = 0;

  // ── mount ──────────────────────────────────────────────
  function mount(container) {
    if (!container || wrapEl) return;

    // Wrapper div — reuses #alignmentRing id so app.js is-hit toggle works
    wrapEl = document.createElement("div");
    wrapEl.id = "alignmentRing";
    wrapEl.className = "path-sector";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.id = "pathSectorSvg";
    svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("class", "path-sector__svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Swing path direction");
    svgRoot = svg;

    // ── defs: radial gradient for the sweep fill ──
    const defs = document.createElementNS(SVG_NS, "defs");

    const grad = mkSvg("radialGradient", {
      id: "pathSweepGrad",
      gradientUnits: "userSpaceOnUse",
      cx: PX, cy: PY, r: ARC_R
    });
    gradFill = mkSvg("stop", { offset: "15%", "stop-color": "rgba(216,200,166,0)", "stop-opacity": "1" });
    gradFillLocked = mkSvg("stop", { offset: "100%", "stop-color": "rgba(216,200,166,0.32)", "stop-opacity": "1" });
    grad.appendChild(gradFill);
    grad.appendChild(gradFillLocked);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // ── background sector (full range, very subtle) ──
    svg.appendChild(mkSvg("path", {
      d: sectorPath(-MAX_DEG, MAX_DEG),
      class: "path-sector__bg",
      fill: "rgba(216,200,166,0.04)",
      stroke: "none"
    }));

    // ── sweet zone sector (±SWEET°) ──
    svg.appendChild(mkSvg("path", {
      d: sectorPath(-SWEET, SWEET),
      class: "path-sector__sweet",
      fill: "rgba(216,200,166,0.12)",
      stroke: "none"
    }));

    // ── dynamic fill (radar sweep) ──
    fillEl = mkSvg("path", {
      d: "",
      class: "path-sector__fill",
      fill: "url(#pathSweepGrad)",
      stroke: "none"
    });
    svg.appendChild(fillEl);

    // ── outer scale arc ──
    svg.appendChild(mkSvg("path", {
      d: arcPath(-MAX_DEG, MAX_DEG),
      class: "path-sector__arc",
      fill: "none",
      stroke: "rgba(216,200,166,0.38)",
      "stroke-width": "0.9",
      "stroke-linecap": "round"
    }));

    // ── needle ──
    const [ntx, nty] = tipAt(0, NEEDLE);
    needleEl = mkSvg("line", {
      x1: PX, y1: PY,
      x2: ntx.toFixed(2), y2: nty.toFixed(2),
      class: "path-sector__needle",
      stroke: "rgba(216,200,166,0.88)",
      "stroke-width": "1.6",
      "stroke-linecap": "round"
    });
    svg.appendChild(needleEl);

    // ── needle tip dot ──
    tipEl = mkSvg("circle", {
      cx: ntx.toFixed(2), cy: nty.toFixed(2),
      r: "3.2",
      class: "path-sector__tip",
      fill: "rgba(216,200,166,1)",
      stroke: "rgba(255,255,255,0.28)",
      "stroke-width": "0.9"
    });
    svg.appendChild(tipEl);

    // ── pivot dot ──
    svg.appendChild(mkSvg("circle", {
      cx: PX, cy: PY,
      r: "2.5",
      class: "path-sector__pivot",
      fill: "rgba(216,200,166,0.62)",
      stroke: "rgba(0,0,0,0.20)",
      "stroke-width": "0.8"
    }));

    wrapEl.appendChild(svg);

    // ── external scale strip (L / R labels below arc) ──
    const scaleDiv = document.createElement("div");
    scaleDiv.className = "path-sector__scale";
    ["L", "R"].forEach(label => {
      const span = document.createElement("span");
      span.className = "path-sector__scaleLabel";
      span.textContent = label;
      scaleDiv.appendChild(span);
    });
    wrapEl.appendChild(scaleDiv);

    container.appendChild(wrapEl);

    // hide legacy Pixi container if present
    const pixiEl = container.querySelector("#pathPixi");
    if (pixiEl) pixiEl.style.display = "none";
  }

  // ── internal render (deg) ──────────────────────────────
  function _render(deg) {
    _deg = Math.max(-MAX_DEG, Math.min(MAX_DEG, deg));
    if (!svgRoot) return;

    const [tx, ty] = tipAt(_deg, NEEDLE);
    needleEl.setAttribute("x2", tx.toFixed(2));
    needleEl.setAttribute("y2", ty.toFixed(2));
    tipEl.setAttribute("cx", tx.toFixed(2));
    tipEl.setAttribute("cy", ty.toFixed(2));

    // Sector fill: from 0° to current angle
    if (Math.abs(_deg) < 0.05) {
      fillEl.setAttribute("d", "");
    } else {
      const [a, b] = _deg > 0 ? [0, _deg] : [_deg, 0];
      fillEl.setAttribute("d", sectorPath(a, b));
    }
  }

  // ── public API ─────────────────────────────────────────
  function setPath01(v) {
    _render((Number(v) - 0.5) * 2 * MAX_DEG);
  }

  function setAngle(deg) {
    _render(deg);
  }

  function setLocked(isDone) {
    _locked = !!isDone;
    if (!svgRoot) return;

    svgRoot.classList.toggle("is-locked", _locked);

    if (isDone) {
      // brighter gradient stop
      if (gradFillLocked) gradFillLocked.setAttribute("stop-color", "rgba(216,200,166,0.50)");
      needleEl.setAttribute("stroke", "rgba(216,200,166,1.0)");
      tipEl.setAttribute("fill", "rgba(255,255,255,0.90)");
      tipEl.setAttribute("r", "3.8");
    } else {
      if (gradFillLocked) gradFillLocked.setAttribute("stop-color", "rgba(216,200,166,0.32)");
      needleEl.setAttribute("stroke", "rgba(216,200,166,0.88)");
      tipEl.setAttribute("fill", "rgba(216,200,166,1)");
      tipEl.setAttribute("r", "3.2");
    }
  }

  function setHoldFx(active) {
    if (!svgRoot) return;
    svgRoot.classList.toggle("is-holding", !!active);
  }

  function triggerPopFx() {
    if (!svgRoot) return;
    if (_popTimer) { window.clearTimeout(_popTimer); _popTimer = 0; }
    svgRoot.classList.remove("is-popping");
    void svgRoot.offsetWidth; // reflow to restart animation
    svgRoot.classList.add("is-popping");
    _popTimer = window.setTimeout(() => {
      svgRoot?.classList.remove("is-popping");
      _popTimer = 0;
    }, 260);
  }

  function reset() {
    _locked = false;
    setLocked(false);
    setHoldFx(false);
    if (_popTimer) { window.clearTimeout(_popTimer); _popTimer = 0; }
    if (svgRoot) svgRoot.classList.remove("is-popping");
    _render(0);
  }

  function destroy() {
    if (_popTimer) { window.clearTimeout(_popTimer); _popTimer = 0; }
    if (wrapEl && wrapEl.parentElement) wrapEl.remove();
    wrapEl   = null;
    svgRoot  = null;
    fillEl   = null;
    needleEl = null;
    tipEl    = null;
    gradFill = null;
    gradFillLocked = null;
  }

  return { mount, setPath01, setAngle, setLocked, setHoldFx, triggerPopFx, reset, destroy };
}
