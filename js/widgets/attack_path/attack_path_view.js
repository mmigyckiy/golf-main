// ============================================================
// Attack · Path — Crosshair / Scope View
// ============================================================
// Sniper-scope mechanic: crosshair is FIXED at center,
// the golf ball MOVES left-right (pendulum) with small tremor.
// Goal: tap when the moving ball passes over the center crosshair.
//
// Geometry (viewBox 0 0 160 110):
//   Scope center  = (80, 55)
//   Ball range    = ±48px horizontal (0.8 px/° for ±60°)
//                   ±24px vertical   (4 px/° for ±6°, small tremor)
//   Sweet ellipse = rx 5, ry 9  (the "hit zone" at center)
//
// Element roles:
//   hLineEl  — horizontal crosshair line, FIXED at y = CY
//   vLineEl  — vertical crosshair line,   FIXED at x = CX
//   dotEl    — cyan scope-center dot,     FIXED at (CX, CY)
//   ballEl   — white golf ball,           MOVES with path/attack
//   dotRingEl— sync ring,                 FIXED at center (expands on is-sync)
//
// On lock: H+V lines snap to ball's caught position.
//
// States (CSS classes on .apView__svg):
//   is-idle    → dim, no animation
//   is-hold    → active arming — ball sweeps
//   is-holding → pulse animation on ball
//   is-locked  → ball freezes, lines snap to it
//   is-sync    → ball inside ellipse → center flares
//   is-perfect → 700 ms white-flash on lock while in-sync
// ============================================================

const SVG_NS = "http://www.w3.org/2000/svg";
const VB_W = 160;
const VB_H = 110;

const CX = 80;   // scope center x
const CY = 55;   // scope center y

const ATK_SCALE  = 24 / 6;   // 4 px/° → ±24 px for ±6°
const PATH_SCALE = 48 / 60;  // 0.8 px/° → ±48 px for ±60°

const SZ_RX = 5;   // sweet ellipse x-radius (path strict ≈ 4 px)
const SZ_RY = 9;   // sweet ellipse y-radius (attack strict ≈ 8 px)

const PERFECT_DURATION_MS = 700;

const LERP_A = 0.10;  // attack lerp
const LERP_P = 0.18;  // path lerp — higher = ball tracks sine tightly, no visible lag

function mkSvg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ── factory ──────────────────────────────────────────────────

export function createAttackPathView() {
  let wrapEl      = null;
  let svgRoot     = null;
  let hLineEl     = null;  // horizontal crosshair line (attack)
  let vLineEl     = null;  // vertical crosshair line (path)
  let dotEl       = null;  // moving crosshair center dot
  let dotRingEl   = null;  // sync ring around dot
  let ballEl      = null;  // fixed golf ball at center (target)
  let targetEl    = null;  // sweet-zone inner ellipse

  let _attackDeg  = 0;   // target attack (degrees ±6)
  let _pathDeg    = 0;   // target path   (degrees ±60)
  let _curAtkDeg  = 0;   // lerp-smoothed
  let _curPathDeg = 0;   // lerp-smoothed
  let _rafId      = null;
  let _perfectTimer = null;

  // ── animation ─────────────────────────────────────────────

  function _animTick() {
    _rafId = null;
    const da = _attackDeg - _curAtkDeg;
    const dp = _pathDeg   - _curPathDeg;
    const doneA = Math.abs(da) < 0.02;
    const doneP = Math.abs(dp) < 0.05;

    _curAtkDeg  = doneA ? _attackDeg : _curAtkDeg  + da * LERP_A;
    _curPathDeg = doneP ? _pathDeg   : _curPathDeg + dp * LERP_P;

    _renderNow();
    if (!doneA || !doneP) _rafId = requestAnimationFrame(_animTick);
  }

  function _scheduleAnim() {
    if (!_rafId) _rafId = requestAnimationFrame(_animTick);
  }

  function _renderNow() {
    if (!ballEl) return;
    const dx = (CX + _curPathDeg * PATH_SCALE).toFixed(2);
    const dy = (CY - _curAtkDeg  * ATK_SCALE).toFixed(2);

    // Only the ball moves — crosshair lines and center dot stay fixed
    ballEl.setAttribute("cx", dx);
    ballEl.setAttribute("cy", dy);
    // dotEl, dotRingEl, hLineEl, vLineEl stay at (CX, CY) — no updates
  }

  // snap to current targets (no lerp) — used on mount and reset
  function _renderSnap() {
    _curAtkDeg  = _attackDeg;
    _curPathDeg = _pathDeg;
    _renderNow();
  }

  // ── mount ──────────────────────────────────────────────────

  function mount(container) {
    if (!container || wrapEl) return;

    wrapEl = document.createElement("div");
    wrapEl.className = "apView";

    const svg = mkSvg("svg", {
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      class: "apView__svg is-idle",
      role: "img",
      "aria-label": "Attack and path crosshair",
      preserveAspectRatio: "xMidYMid slice"
    });
    svgRoot = svg;

    // ── defs ──────────────────────────────────────────────────
    const defs = document.createElementNS(SVG_NS, "defs");

    // Neon orb radial gradient for the dot
    const dotGrad = mkSvg("radialGradient", {
      id: "xhDotGrad", cx: "35%", cy: "30%", r: "65%",
      gradientUnits: "objectBoundingBox"
    });
    dotGrad.appendChild(mkSvg("stop", { offset: "0%",   "stop-color": "rgba(255,255,255,0.95)" }));
    dotGrad.appendChild(mkSvg("stop", { offset: "45%",  "stop-color": "#00F5FF" }));
    dotGrad.appendChild(mkSvg("stop", { offset: "100%", "stop-color": "rgba(0,200,230,0.70)" }));
    defs.appendChild(dotGrad);
    svg.appendChild(defs);

    // ── Layer 1: Background scope rings (decorative, static) ──
    [44, 30, 17].forEach((r, i) => {
      svg.appendChild(mkSvg("circle", {
        cx: CX, cy: CY, r,
        class: `xhScope__ring xhScope__ring--${i + 1}`,
        fill: "none",
        stroke: `rgba(0,245,255,${0.04 + i * 0.015})`,
        "stroke-width": "0.7"
      }));
    });

    // ── Layer 2: Target outer ring (softer boundary cue) ──
    svg.appendChild(mkSvg("ellipse", {
      cx: CX, cy: CY,
      rx: SZ_RX * 3, ry: SZ_RY * 3,
      class: "xhTarget__outer",
      fill: "none",
      stroke: "rgba(0,245,255,0.08)",
      "stroke-width": "0.7"
    }));

    // ── Layer 3: Sweet zone inner ellipse ──
    targetEl = mkSvg("ellipse", {
      cx: CX, cy: CY,
      rx: SZ_RX, ry: SZ_RY,
      class: "xhTarget__inner",
      fill: "rgba(0,245,255,0.07)",
      stroke: "rgba(0,245,255,0.40)",
      "stroke-width": "1.2"
    });
    svg.appendChild(targetEl);

    // ── Layer 4: H-line — attack (moves vertically) ──
    hLineEl = mkSvg("line", {
      x1: 0, y1: CY, x2: VB_W, y2: CY,
      class: "xhAxis__h",
      stroke: "rgba(0,245,255,0.65)",
      "stroke-width": "1.3",
      "stroke-dasharray": "6 4"
    });
    svg.appendChild(hLineEl);

    // ── Layer 5: V-line — path (moves horizontally) ──
    vLineEl = mkSvg("line", {
      x1: CX, y1: 0, x2: CX, y2: VB_H,
      class: "xhAxis__v",
      stroke: "rgba(0,245,255,0.65)",
      "stroke-width": "1.3",
      "stroke-dasharray": "6 4"
    });
    svg.appendChild(vLineEl);

    // ── Layer 6: Center reference ticks (static) ──
    [[-8,0],[8,0],[0,-8],[0,8]].forEach(([ddx, ddy]) => {
      svg.appendChild(mkSvg("line", {
        x1: CX + ddx * 0.3, y1: CY + ddy * 0.3,
        x2: CX + ddx,       y2: CY + ddy,
        class: "xhScope__tick",
        stroke: "rgba(0,245,255,0.35)",
        "stroke-width": "1",
        "stroke-linecap": "round"
      }));
    });

    // ── Layer 7: Fixed golf ball at center (the target, never moves) ──
    ballEl = mkSvg("circle", {
      cx: CX, cy: CY, r: 4.5,
      class: "xhBall",
      fill: "rgba(255,255,255,0.88)",
      stroke: "rgba(255,255,255,0.25)",
      "stroke-width": "1"
    });
    svg.appendChild(ballEl);

    // ── Layer 8: Sync ring (hidden by default, expands on is-sync) ──
    dotRingEl = mkSvg("circle", {
      cx: CX, cy: CY, r: 12,
      class: "xhDot__ring",
      fill: "none",
      stroke: "rgba(0,245,255,0)",
      "stroke-width": "1.5"
    });
    svg.appendChild(dotRingEl);

    // ── Layer 9: Moving crosshair center dot (rides the lines intersection) ──
    dotEl = mkSvg("circle", {
      cx: CX, cy: CY, r: 5,
      class: "xhDot",
      fill: "url(#xhDotGrad)",
      stroke: "none"
    });
    svg.appendChild(dotEl);

    // ── Axis labels ────────────────────────────────────────────
    // Attack labels (left edge, for H-line range)
    [
      { dy: -24, text: "+6°" },
      { dy:   0, text:  "0°" },
      { dy: +24, text: "−6°" }
    ].forEach(({ dy, text }) => {
      const t = mkSvg("text", {
        x: 3, y: (CY + dy + 2.2).toFixed(1),
        class: "xhAxis__label",
        "font-size": "6.5", "text-anchor": "start",
        fill: "rgba(216,200,166,0.28)", "letter-spacing": "0.04em"
      });
      t.textContent = text;
      svg.appendChild(t);
    });

    // Path labels (top edge, for V-line range)
    [
      { dx: -48, text: "−60°", anchor: "middle" },
      { dx: +48, text: "+60°", anchor: "middle" }
    ].forEach(({ dx, text, anchor }) => {
      const t = mkSvg("text", {
        x: (CX + dx).toFixed(1), y: "5.5",
        class: "xhAxis__label",
        "font-size": "6.5", "text-anchor": anchor,
        fill: "rgba(216,200,166,0.28)", "letter-spacing": "0.04em"
      });
      t.textContent = text;
      svg.appendChild(t);
    });

    wrapEl.appendChild(svg);
    container.appendChild(wrapEl);
    _renderSnap();
  }

  // ── public API ─────────────────────────────────────────────

  /** deg: ±6 → moves H-line vertically */
  function setAttack(deg) {
    _attackDeg = Number.isFinite(deg)
      ? Math.max(-6, Math.min(6, deg))
      : 0;
    _scheduleAnim();
  }

  /** v: 0 (−60°) … 0.5 (center) … 1 (+60°) → moves V-line horizontally */
  function setPath01(v) {
    _pathDeg = (Number.isFinite(v) ? v : 0.5) * 120 - 60;
    _scheduleAnim();
  }

  function setSyncState(isSync) {
    if (!svgRoot) return;
    svgRoot.classList.toggle("is-sync", !!isSync);
  }

  function triggerPerfect() {
    if (!svgRoot) return;
    if (_perfectTimer) clearTimeout(_perfectTimer);
    svgRoot.classList.add("is-perfect");
    _perfectTimer = setTimeout(() => {
      svgRoot?.classList.remove("is-perfect");
      _perfectTimer = null;
    }, PERFECT_DURATION_MS);
  }

  function setState(state) {
    if (!svgRoot) return;
    svgRoot.classList.remove("is-idle", "is-active", "is-hold", "is-locked");
    svgRoot.classList.add(`is-${String(state || "idle").toLowerCase()}`);
  }

  function setHoldFx(active) {
    if (!svgRoot) return;
    svgRoot.classList.toggle("is-holding", !!active);
    if (!active) setSyncState(false);
  }

  function setLocked(isDone) {
    if (!svgRoot) return;
    svgRoot.classList.toggle("is-locked", !!isDone);
    if (isDone && ballEl && hLineEl && vLineEl) {
      // Snap crosshair lines to wherever the ball was caught — satisfying lock-on
      const cx = ballEl.getAttribute("cx");
      const cy = ballEl.getAttribute("cy");
      hLineEl.setAttribute("y1", cy);
      hLineEl.setAttribute("y2", cy);
      vLineEl.setAttribute("x1", cx);
      vLineEl.setAttribute("x2", cx);
      ballEl.setAttribute("r", "6");
    } else if (!isDone && ballEl) {
      // Reset lines to center, ball back to normal size
      hLineEl?.setAttribute("y1", String(CY));
      hLineEl?.setAttribute("y2", String(CY));
      vLineEl?.setAttribute("x1", String(CX));
      vLineEl?.setAttribute("x2", String(CX));
      ballEl.setAttribute("r", "4.5");
    }
  }

  function reset() {
    if (_perfectTimer) { clearTimeout(_perfectTimer); _perfectTimer = null; }
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    setState("idle");
    setHoldFx(false);
    setSyncState(false);
    // Reset lines to center and ball to normal size (bypassing setLocked logic)
    if (hLineEl) { hLineEl.setAttribute("y1", String(CY)); hLineEl.setAttribute("y2", String(CY)); }
    if (vLineEl) { vLineEl.setAttribute("x1", String(CX)); vLineEl.setAttribute("x2", String(CX)); }
    if (ballEl)  ballEl.setAttribute("r", "4.5");
    svgRoot?.classList.remove("is-locked");
    _attackDeg = 0; _curAtkDeg  = 0;
    _pathDeg   = 0; _curPathDeg = 0;
    _renderSnap();
  }

  function destroy() {
    if (_perfectTimer) { clearTimeout(_perfectTimer); _perfectTimer = null; }
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (wrapEl?.parentElement) wrapEl.remove();
    wrapEl = null; svgRoot = null;
    hLineEl = null; vLineEl = null;
    dotEl = null; dotRingEl = null; ballEl = null; targetEl = null;
  }

  return {
    mount, setAttack, setPath01,
    setSyncState, triggerPerfect,
    setState, setHoldFx, setLocked,
    reset, destroy
  };
}
