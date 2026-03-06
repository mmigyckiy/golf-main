// ============================================================
// Flight Field — Side-View Arc Renderer  (Aviator-golf style)
// ============================================================
//
// TRAJECTORY STORAGE — why it matters
// ------------------------------------
// flightProgress grows linearly with wall-clock time.
// liveDistanceYd grows exponentially (compounding multiplier).
// Computing x = liveYd * progress every frame uses the CURRENT
// (large) liveYd for all historical points, causing the arc to
// re-stretch backward and the ball to appear to "shoot" forward.
//
// Fix: record (xFrac, t) once per progress-slot as the ball
// first reaches that slot, using the liveYd at that moment.
// Historical slots are frozen; only the live tip stretches.
// This preserves the correct arc shape at any canvas width
// because coordinates are stored normalized (layout-independent).
//
// Static arcs (ENDED / CRASHED) still use the mathematical
// parabola — they don't change and draw correctly with 3 calls.
// ============================================================

export function createFieldTopView() {

  // ── State ─────────────────────────────────────────────────
  let canvas       = null;
  let ctx          = null;
  let rafId        = null;
  let phase        = 'idle';   // idle | running | ended | crashed
  let landYd       = 0;
  let landProgress = 0;
  // Landing animation state (cashout: ball continues along arc to ground)
  let landAnim  = { active: false, start: 0, from: 0, duration: 0 };
  // Crash drop animation state (crash: ball falls from arc pos to ground)
  let crashDrop = { active: false, start: 0, fromY: 0, duration: 0 };

  // Trajectory: stores the ball's actual historical path as
  // normalized coords so the arc looks identical on any canvas.
  const TRAJ_SLOTS = 100;
  const _trajX  = new Float32Array(TRAJ_SLOTS + 1); // xFrac per slot
  const _trajT  = new Float32Array(TRAJ_SLOTS + 1); // actual progress per slot
  let _trajFilled = -1;

  const FIELD_YD = 450;

  // ── Layout ────────────────────────────────────────────────

  function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }

  /** All layout constants derived from canvas size.
   *  S = min(W,H) keeps proportions identical on square and wide canvases. */
  function L(W, H) {
    const S       = Math.min(W, H);
    const groundY = H * 0.76;
    const teeX    = W * 0.055;
    const fieldW  = W * 0.875;
    const maxArcH = groundY * 0.70;
    const R       = Math.max(3.5, S * 0.032);
    return { groundY, teeX, fieldW, maxArcH, S, R };
  }

  function groundPos(l, distYd) {
    return { x: l.teeX + Math.min(1, (distYd || 0) / FIELD_YD) * l.fieldW, y: l.groundY };
  }

  // ── Trajectory management ─────────────────────────────────

  function resetTrajectory() {
    _trajFilled  = 0;
    _trajX[0]    = 0;   // ball starts at tee
    _trajT[0]    = 0;
  }

  /** Record the ball's position each time a new progress-slot is reached.
   *  Uses liveYd AT THAT MOMENT — so early slow-multiplier slots
   *  have small xFrac and the arc shape is historically accurate. */
  function updateTrajectory(progress, liveYd) {
    const slot = Math.min(TRAJ_SLOTS, Math.floor(progress * TRAJ_SLOTS));

    if (slot > _trajFilled) {
      // First time reaching this slot (and possibly skipped ones at 60 fps)
      for (let i = _trajFilled + 1; i <= slot; i++) {
        // Use actual progress for the newest slot; interpolate for skipped ones
        const ti = (i === slot) ? progress : (i / TRAJ_SLOTS);
        _trajX[i] = Math.min(1, (liveYd * ti) / FIELD_YD);
        _trajT[i] = ti;
      }
      _trajFilled = slot;
    } else {
      // Still in the same slot — update with the latest liveYd (multiplier grew)
      const liveXFrac = Math.min(1, (liveYd * progress) / FIELD_YD);
      if (liveXFrac > _trajX[slot]) {
        _trajX[slot] = liveXFrac;
        _trajT[slot] = progress;
      }
    }
  }

  // ── Background ────────────────────────────────────────────

  function drawBackground(W, H, l) {
    const sky = ctx.createLinearGradient(0, 0, 0, l.groundY);
    sky.addColorStop(0,   '#04070c');
    sky.addColorStop(0.6, '#091420');
    sky.addColorStop(1,   '#0e1f1b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, l.groundY);

    const grd = ctx.createLinearGradient(0, l.groundY, 0, H);
    grd.addColorStop(0, 'rgba(30,62,32,1)');
    grd.addColorStop(1, 'rgba(10,24,12,1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, l.groundY, W, H - l.groundY);

    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, l.groundY); ctx.lineTo(W, l.groundY);
    ctx.stroke();
  }

  // ── Distance markers ──────────────────────────────────────

  function drawDistanceMarkers(W, H, l) {
    const fSize = Math.max(7, Math.round(l.S * 0.031));
    [100, 150, 200, 250, 300, 350, 400].forEach(yd => {
      const x = l.teeX + (yd / FIELD_YD) * l.fieldW;

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, l.groundY - 4); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x, l.groundY - 5); ctx.lineTo(x, l.groundY + 7); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font      = `${fSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(yd), x, l.groundY + fSize * 2 + 2);
    });
  }

  // ── Tee ───────────────────────────────────────────────────

  function drawTee(W, H, l, showBall = true) {
    const x     = l.teeX, y = l.groundY;
    const S     = l.S;
    const pegH  = Math.max(8,   S * 0.035);    // total height ground → head (slimmed)
    const headW = Math.max(3.5, S * 0.020);    // disc half-width (T shape, slimmed)
    const headH = Math.max(1.5, S * 0.007);    // disc half-height (flat ellipse, slimmed)
    const shW   = Math.max(0.8, S * 0.004);    // shaft half-width (very thin)
    const ballR = Math.max(2.8, S * 0.014);    // golf ball radius (slimmed)
    const glR   = Math.max(12,  S * 0.065);    // glow radius (slimmed)
    const fSize = Math.max(7,   Math.round(S * 0.031));

    const topY  = y - pegH;                    // disc center Y
    const ballY = topY - headH - ballR * 0.10; // ball sits on top of disc

    ctx.setLineDash([]);

    // 1 ── Ground halo: soft elliptical spotlight
    const gh = ctx.createRadialGradient(x, y, 0, x, y, glR);
    gh.addColorStop(0,    'rgba(216,200,166,0.16)');
    gh.addColorStop(0.50, 'rgba(216,200,166,0.05)');
    gh.addColorStop(1,    'rgba(216,200,166,0)');
    ctx.fillStyle = gh;
    ctx.beginPath();
    ctx.ellipse(x, y, glR, glR * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2 ── Shaft (thin peg from ground up to underside of disc)
    ctx.strokeStyle = 'rgba(232,214,180,0.84)';
    ctx.lineWidth   = shW * 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, topY + headH);
    ctx.stroke();

    // 3 ── Disc shadow (bottom rim — gives thickness/depth to the head)
    ctx.fillStyle = 'rgba(175,152,105,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, topY + headH * 0.55, headW, headH, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 ── Disc face (top surface, warm gradient for 3-D roundness)
    const dg = ctx.createRadialGradient(
      x - headW * 0.22, topY - headH * 0.4, 0,
      x, topY, headW * 1.15
    );
    dg.addColorStop(0,    'rgba(252,234,198,0.97)');
    dg.addColorStop(0.55, 'rgba(236,216,174,0.93)');
    dg.addColorStop(1,    'rgba(212,190,144,0.85)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(x, topY, headW, headH, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 ── Disc rim (thin outline for crisp edge)
    ctx.strokeStyle = 'rgba(195,170,120,0.50)';
    ctx.lineWidth   = shW * 1.2;
    ctx.beginPath();
    ctx.ellipse(x, topY, headW, headH, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 6 ── Ball (only when not in flight)
    if (showBall) {
      // Soft glow under ball
      const bg = ctx.createRadialGradient(x, ballY, 0, x, ballY, glR * 0.75);
      bg.addColorStop(0,    'rgba(238,222,198,0.22)');
      bg.addColorStop(0.42, 'rgba(216,200,166,0.07)');
      bg.addColorStop(1,    'rgba(216,200,166,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(x, ballY, glR * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Ball body — warm off-white base (golf ball colour)
      const ballGrad = ctx.createRadialGradient(
        x - ballR * 0.30, ballY - ballR * 0.32, 0,
        x, ballY, ballR
      );
      ballGrad.addColorStop(0,   'rgba(255,255,253,0.99)');
      ballGrad.addColorStop(0.55,'rgba(242,238,228,0.97)');
      ballGrad.addColorStop(1,   'rgba(216,208,190,0.92)');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(x, ballY, ballR, 0, Math.PI * 2);
      ctx.fill();

      // ── Golf ball dimples ──
      // 6 outer dimples in a ring + 1 center dimple
      const dimR    = Math.max(0.5, ballR * 0.20);
      const dimDist = ballR * 0.48;
      ctx.fillStyle = 'rgba(130,118,100,0.28)';
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 - 15) * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(x + dimDist * Math.cos(a), ballY + dimDist * Math.sin(a), dimR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();                           // center dimple
      ctx.arc(x, ballY, dimR, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight (top-left gleam, drawn over dimples)
      const sg = ctx.createRadialGradient(
        x - ballR * 0.28, ballY - ballR * 0.30, 0,
        x - ballR * 0.28, ballY - ballR * 0.30, ballR * 0.50
      );
      sg.addColorStop(0, 'rgba(255,255,255,0.82)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(x, ballY, ballR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7 ── TEE label
    ctx.fillStyle = 'rgba(216,200,166,0.40)';
    ctx.font      = `${fSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TEE', x, y + fSize * 2 + 2);
  }

  // ── Live trajectory arc (RUNNING state) ───────────────────
  // Draws the historically-accurate stored path + live ball tip.

  function drawTrajectory(l, progress, liveYd) {
    if (_trajFilled < 0) return;

    ctx.setLineDash([]);

    const n   = _trajFilled + 2;   // stored slots (0..filled) + current ball tip
    const xs  = new Float32Array(n);
    const ys  = new Float32Array(n);

    // Slot 0 → tee
    xs[0] = l.teeX;
    ys[0] = l.groundY;

    // Historical slots 1..trajFilled
    for (let i = 1; i <= _trajFilled; i++) {
      xs[i] = l.teeX + _trajX[i] * l.fieldW;
      const t = _trajT[i];
      ys[i] = l.groundY - l.maxArcH * 4 * t * (1 - t);
    }

    // Current ball (live tip — may be slightly ahead of last slot)
    const xFrac = Math.min(1, (liveYd * progress) / FIELD_YD);
    xs[n - 1] = l.teeX + xFrac * l.fieldW;
    ys[n - 1] = l.groundY - l.maxArcH * 4 * progress * (1 - progress);

    function tracePath(from, to) {
      ctx.beginPath();
      ctx.moveTo(xs[from], ys[from]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(xs[i], ys[i]);
    }

    const startX = xs[0];
    const endX   = xs[n - 1];
    const span   = Math.max(1, endX - startX);

    // 1. Gradient main line (glow removed)
    const grad = ctx.createLinearGradient(startX, 0, startX + span, 0);
    grad.addColorStop(0,    'rgba(230,220,195,0)');
    grad.addColorStop(0.12, 'rgba(230,220,195,0.25)');
    grad.addColorStop(1,    'rgba(230,220,195,0.95)');
    tracePath(0, n - 1);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = Math.max(1.5, l.S * 0.011);
    ctx.stroke();

    // 3. Bright core (last 15% of arc)
    const tipFrom = Math.max(0, n - Math.ceil(n * 0.15) - 1);
    tracePath(tipFrom, n - 1);
    ctx.strokeStyle = 'rgba(255,248,225,0.65)';
    ctx.lineWidth   = Math.max(1, l.S * 0.007);
    ctx.stroke();
  }

  // ── Static arc (ENDED / CRASHED) — mathematical parabola ──
  // These states are frozen so re-stretching is not an issue.

  function drawArcPath(l, progress, liveYd) {
    if (progress <= 0.015 || !liveYd) return;

    ctx.setLineDash([]);

    const STEPS = 64;
    const xs    = new Float32Array(STEPS + 1);
    const ys    = new Float32Array(STEPS + 1);
    for (let i = 0; i <= STEPS; i++) {
      const t  = (i / STEPS) * progress;
      xs[i]    = l.teeX + Math.min(1, (liveYd * t) / FIELD_YD) * l.fieldW;
      ys[i]    = l.groundY - l.maxArcH * 4 * t * (1 - t);
    }

    const span = Math.max(1, xs[STEPS] - xs[0]);

    function tracePath(from, to) {
      ctx.beginPath();
      ctx.moveTo(xs[from], ys[from]);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(xs[i], ys[i]);
    }

    const grad = ctx.createLinearGradient(xs[0], 0, xs[0] + span, 0);
    grad.addColorStop(0,    'rgba(230,220,195,0)');
    grad.addColorStop(0.12, 'rgba(230,220,195,0.25)');
    grad.addColorStop(1,    'rgba(230,220,195,0.95)');
    tracePath(0, STEPS);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = Math.max(1.5, l.S * 0.011);
    ctx.stroke();

    const tipFrom = Math.floor(STEPS * 0.85);
    tracePath(tipFrom, STEPS);
    ctx.strokeStyle = 'rgba(255,248,225,0.65)';
    ctx.lineWidth   = Math.max(1, l.S * 0.007);
    ctx.stroke();
  }

  // ── Ball ──────────────────────────────────────────────────

  function drawBall(x, y, ballPhase, l) {
    const R       = ballPhase === 'RUNNING' ? l.R : l.R * 0.82;
    const crashed = ballPhase === 'CRASHED';
    const cr      = crashed ? '230,80,55'   : '216,200,166';
    const cw      = crashed ? '255,170,150' : '255,255,255';

    ctx.setLineDash([]);

    if (ballPhase === 'RUNNING') {
      const gY = l.groundY;
      ctx.setLineDash([Math.max(2, l.S * 0.012), Math.max(3, l.S * 0.016)]);
      ctx.strokeStyle = 'rgba(216,200,166,0.18)';
      ctx.lineWidth   = Math.max(0.5, l.S * 0.004);
      ctx.beginPath(); ctx.moveTo(x, y + R + 1); ctx.lineTo(x, gY); ctx.stroke();
      ctx.setLineDash([]);

      const gR = R * 2.7;
      const sh = ctx.createRadialGradient(x, gY, 0, x, gY, gR);
      sh.addColorStop(0, 'rgba(216,200,166,0.28)');
      sh.addColorStop(1, 'rgba(216,200,166,0)');
      ctx.fillStyle = sh;
      ctx.beginPath(); ctx.ellipse(x, gY, gR, gR * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    }

    const g2 = ctx.createRadialGradient(x, y, 0, x, y, R * 7);
    g2.addColorStop(0, `rgba(${cr},0.22)`); g2.addColorStop(1, `rgba(${cr},0)`);
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(x, y, R * 7, 0, Math.PI * 2); ctx.fill();

    const g1 = ctx.createRadialGradient(x, y, 0, x, y, R * 3.5);
    g1.addColorStop(0, `rgba(${cr},0.55)`); g1.addColorStop(1, `rgba(${cr},0)`);
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.arc(x, y, R * 3.5, 0, Math.PI * 2); ctx.fill();

    const gb = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, 0, x, y, R);
    gb.addColorStop(0,   `rgba(${cw},0.98)`);
    gb.addColorStop(0.4, crashed ? 'rgba(220,100,70,0.95)' : 'rgba(235,225,200,0.95)');
    gb.addColorStop(1,   crashed ? 'rgba(180,50,30,0.88)'  : 'rgba(200,188,160,0.88)');
    ctx.fillStyle = gb;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

    const gs = ctx.createRadialGradient(x - R * 0.28, y - R * 0.32, 0, x - R * 0.28, y - R * 0.32, R * 0.55);
    gs.addColorStop(0, 'rgba(255,255,255,0.85)');
    gs.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gs;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  }

  // ── Live distance counter ─────────────────────────────────

  function drawLiveCounter(W, H, yd, l) {
    if (!yd) return;

    const cx  = W * 0.5;
    const cy  = H * 0.38;
    const fs  = Math.max(18, Math.round(l.S * 0.082));
    const fsS = Math.max(9,  Math.round(l.S * 0.040));

    const pillW = fs * 3.8, pillH = fs * 1.1;
    const rx    = cx - pillW / 2;
    const ry    = cy - fs * 0.82;
    const rad   = pillH * 0.45;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(rx + rad, ry);
    ctx.lineTo(rx + pillW - rad, ry);
    ctx.arcTo(rx + pillW, ry,          rx + pillW, ry + rad,         rad);
    ctx.lineTo(rx + pillW, ry + pillH - rad);
    ctx.arcTo(rx + pillW, ry + pillH,  rx + pillW - rad, ry + pillH, rad);
    ctx.lineTo(rx + rad,  ry + pillH);
    ctx.arcTo(rx,         ry + pillH,  rx, ry + pillH - rad,         rad);
    ctx.lineTo(rx,        ry + rad);
    ctx.arcTo(rx,         ry,          rx + rad, ry,                  rad);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'rgba(216,200,166,0.70)';
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = 'rgba(255,255,255,0.96)';
    ctx.font        = `700 ${fs}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign   = 'center';
    ctx.fillText(`${Math.round(yd)}`, cx - fs * 0.55, cy);

    ctx.shadowBlur  = 8;
    ctx.fillStyle   = 'rgba(216,200,166,0.80)';
    ctx.font        = `600 ${fsS}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText('YD', cx + fs * 0.82, cy - fs * 0.12);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  // ── Landing zone ──────────────────────────────────────────

  function drawLandingZone(x, y, yd, l) {
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(216,200,166,0.28)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, y - l.R * 4); ctx.lineTo(x, y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(216,200,166,0.45)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.ellipse(x, y + l.R * 0.4, l.R * 2.2, l.R * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    if (yd > 0) {
      const fSize = Math.max(11, Math.round(l.S * 0.050));
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font      = `700 ${fSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(yd)} YD`, x, y - l.R * 4.5);
    }
  }

  // ── Round-rect path helper ────────────────────────────────
  function _rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);  ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);  ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);      ctx.arcTo(x,     y,     x + r, y,          r);
    ctx.closePath();
  }

  // ── Exit glow at right edge (ball beyond FIELD_YD, still in flight) ─
  function drawExitGlow(l, progress) {
    const ex  = l.teeX + l.fieldW;
    const ey  = l.groundY - l.maxArcH * 4 * progress * (1 - progress);
    const t   = (performance.now() % 1100) / 1100;
    const p   = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

    const hr = l.R * (5.5 + p * 2.5);
    const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, hr);
    hg.addColorStop(0,   `rgba(216,200,166,${(0.50 + p * 0.18).toFixed(2)})`);
    hg.addColorStop(0.4, `rgba(216,200,166,${(0.18 + p * 0.08).toFixed(2)})`);
    hg.addColorStop(1,   'rgba(216,200,166,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(ex, ey, hr, 0, Math.PI * 2); ctx.fill();

    const fSize = Math.max(11, Math.round(l.S * 0.050));
    ctx.shadowColor = 'rgba(216,200,166,0.90)';
    ctx.shadowBlur  = 10 + p * 8;
    ctx.fillStyle   = `rgba(255,248,220,${(0.72 + p * 0.28).toFixed(2)})`;
    ctx.font        = `700 ${fSize}px -apple-system, sans-serif`;
    ctx.textAlign   = 'left';
    ctx.fillText('›', ex + 4, ey + fSize * 0.40);
    ctx.shadowBlur  = 0; ctx.shadowColor = 'transparent';
  }

  // ── Overflow badge (ball landed past FIELD_YD) ────────────
  function drawOverflowMarker(W, H, l, yd) {
    const ex = l.teeX + l.fieldW;
    ctx.setLineDash([]);

    // Fan glow from right wall
    const glW = l.fieldW * 0.30;
    const eg  = ctx.createLinearGradient(ex - glW, 0, ex, 0);
    eg.addColorStop(0, 'rgba(216,200,166,0)');
    eg.addColorStop(1, 'rgba(216,200,166,0.14)');
    ctx.fillStyle = eg;
    ctx.fillRect(ex - glW, 0, glW, l.groundY);

    // Glowing vertical edge line
    ctx.shadowColor = 'rgba(216,200,166,0.65)';
    ctx.shadowBlur  = 16;
    ctx.strokeStyle = 'rgba(216,200,166,0.72)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(ex, 8); ctx.lineTo(ex, l.groundY); ctx.stroke();
    ctx.shadowBlur  = 0; ctx.shadowColor = 'transparent';

    // Exit arrows pointing right (just outside edge)
    const arrowY = l.groundY - l.maxArcH * 0.52;
    const fa = Math.max(13, Math.round(l.S * 0.058));
    ctx.shadowColor = 'rgba(216,200,166,0.80)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = 'rgba(255,248,220,0.92)';
    ctx.font        = `700 ${fa}px -apple-system, sans-serif`;
    ctx.textAlign   = 'left';
    ctx.fillText('›', ex + 3,         arrowY + fa * 0.38);
    ctx.fillStyle   = 'rgba(255,248,220,0.50)';
    ctx.fillText('›', ex + fa * 0.58, arrowY + fa * 0.38);
    ctx.shadowBlur  = 0; ctx.shadowColor = 'transparent';

    // Floating badge — "◆ Xyd / BEYOND THE FIELD"
    const cx  = ex;
    const cy  = l.groundY - l.maxArcH * 0.88;
    const fs1 = Math.max(14, Math.round(l.S * 0.064));
    const fs2 = Math.max(8,  Math.round(l.S * 0.034));
    const line1 = `\u25C6  ${Math.round(yd)} YD`;
    const line2 = 'BEYOND THE FIELD';

    ctx.font = `700 ${fs1}px -apple-system, BlinkMacSystemFont, sans-serif`;
    const tw1 = ctx.measureText(line1).width;
    ctx.font = `500 ${fs2}px -apple-system, BlinkMacSystemFont, sans-serif`;
    const tw2 = ctx.measureText(line2).width;

    const padX = 14, padY = 10, gap = 5;
    const bw = Math.max(tw1, tw2) + padX * 2;
    const bh = fs1 + gap + fs2 + padY * 2;
    const bxRaw = cx - bw / 2;
    const bx = Math.min(bxRaw, W - bw - 6);   // keep badge inside canvas
    const by = cy - bh / 2;

    ctx.fillStyle = 'rgba(6,10,16,0.84)';
    _rrect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(216,200,166,0.38)';
    ctx.lineWidth   = 1;
    _rrect(bx, by, bw, bh, 8); ctx.stroke();

    const badgeCX = bx + bw / 2;  // actual center after clamping
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(216,200,166,0.88)';
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = 'rgba(255,252,240,0.97)';
    ctx.font        = `700 ${fs1}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(line1, badgeCX, by + padY + fs1);

    ctx.shadowBlur  = 4;
    ctx.fillStyle   = 'rgba(216,200,166,0.60)';
    ctx.font        = `500 ${fs2}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(line2, badgeCX, by + padY + fs1 + gap + fs2);
    ctx.shadowBlur  = 0; ctx.shadowColor = 'transparent';
  }

  // ── Main render ───────────────────────────────────────────

  function renderFrame() {
    if (!canvas || !ctx) return;

    const W = canvas.clientWidth  || canvas.offsetWidth;
    const H = canvas.clientHeight || canvas.offsetHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    const cw  = Math.round(W * dpr);
    const ch  = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width  = cw;
      canvas.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const l = L(W, H);

    const gs       = window.lastState || {};
    const liveYd   = gs.liveDistanceYd ?? gs.distanceYd ?? 0;
    const progress = clamp01(gs.round?.flightProgress ?? 0);
    const rState   = gs.round?.state ?? 'IDLE';

    // ── Final-distance correction ───────────────────────────
    // currentX starts at 1 and grows to landingX during the 2.2 s flight.
    // liveYd = yardsFromX(currentX) therefore starts at ~half the final value,
    // making the ball crawl near the tee for most of the flight.
    // Fix: compute finalLiveYd = liveYd × (landingX / currentX).
    // This is a constant throughout the flight and gives correct linear speed.
    const currentX    = Math.max(1, gs.currentX || 1);
    const landingX    = Math.max(currentX, gs.round?.landingX || currentX);
    const finalLiveYd = liveYd > 0 ? liveYd * (landingX / currentX) : 0;

    drawBackground(W, H, l);
    drawDistanceMarkers(W, H, l);
    // Ball sits on tee only when round hasn't started yet
    const ballOnTee = phase === 'idle' && rState !== 'RUNNING';
    drawTee(W, H, l, ballOnTee);

    // Local `phase` (set by onCashout / onCrash) takes priority over rState so
    // the ball moves to its landing position immediately when the round ends —
    // even though lastState.round.state may still read "RUNNING" for a frame.
    if (phase === 'ended') {
      // Advance landing animation: ball slides along arc from release point → ground
      if (landAnim.active) {
        const t    = clamp01((performance.now() - landAnim.start) / landAnim.duration);
        const ease = 1 - Math.pow(1 - t, 2);   // easeOutQuad: decelerates as ball lands
        landProgress = landAnim.from + (1.0 - landAnim.from) * ease;
        if (t >= 1) { landAnim.active = false; landProgress = 1.0; }
      }

      if (landProgress >= 1.0) {
        // Fully settled — show static landing state
        if (landYd > FIELD_YD) {
          // Ball landed beyond field — arc to edge, then overflow badge
          drawArcPath(l, FIELD_YD / landYd, landYd);
          drawOverflowMarker(W, H, l, landYd);
        } else {
          const gp = groundPos(l, landYd);
          drawArcPath(l, 1.0, landYd);
          drawLandingZone(gp.x, gp.y, landYd, l);
          drawBall(gp.x, gp.y, 'ENDED', l);
        }
      } else {
        // Still animating — ball travels the remaining arc
        const xFrac = Math.min(1, (landYd * landProgress) / FIELD_YD);
        drawArcPath(l, landProgress, landYd);
        if (landYd > FIELD_YD && xFrac >= 1.0) {
          // Ball has passed the field edge mid-animation — show exit glow
          drawExitGlow(l, landProgress);
        } else {
          const animPos = {
            x: l.teeX + xFrac * l.fieldW,
            y: l.groundY - l.maxArcH * 4 * landProgress * (1 - landProgress)
          };
          drawBall(animPos.x, animPos.y, 'RUNNING', l);
        }
      }

    } else if (phase === 'crashed') {
      if (landProgress > 0) {
        const t        = landProgress;
        const xFrac    = Math.min(1, (landYd * t) / FIELD_YD);
        const arcPos   = {
          x: l.teeX + xFrac * l.fieldW,
          y: l.groundY - l.maxArcH * 4 * t * (1 - t)
        };
        drawArcPath(l, landProgress, landYd || 1);

        // Crash-drop animation: ball falls from arc height to ground (gravity-like)
        if (crashDrop.active) {
          const dt   = clamp01((performance.now() - crashDrop.start) / crashDrop.duration);
          const fall = dt * dt;   // easeInQuad — accelerates like gravity
          const ballY = arcPos.y + (l.groundY - arcPos.y) * fall;
          if (dt >= 1) crashDrop.active = false;
          drawBall(arcPos.x, ballY, 'CRASHED', l);
        } else {
          drawBall(arcPos.x, l.groundY, 'CRASHED', l);
        }
      }

    } else if (rState === 'RUNNING') {
      // Update trajectory with current ball position, then draw it
      if (progress > 0.001) updateTrajectory(progress, finalLiveYd);

      const xFrac = Math.min(1, (finalLiveYd * progress) / FIELD_YD);
      const pos   = {
        x: l.teeX + xFrac * l.fieldW,
        y: l.groundY - l.maxArcH * 4 * progress * (1 - progress)
      };

      drawTrajectory(l, progress, finalLiveYd);
      if (xFrac >= 1.0 && finalLiveYd > FIELD_YD) {
        // Ball's projected distance exceeds field — show exit glow at right wall
        drawExitGlow(l, progress);
      } else {
        drawBall(pos.x, pos.y, 'RUNNING', l);
      }
      // drawLiveCounter removed — shown in main UI header instead
    }
  }

  function startLoop() {
    if (rafId) return;
    const loop = () => { renderFrame(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────

  function mount(container) {
    if (!container || canvas) return;

    const orig = container.querySelector('#flight3dCanvas');
    if (orig) {
      orig.style.setProperty('display', 'none', 'important');
      // Reset canvas to tiny size so any residual resize() calls
      // start from a known small base instead of a huge accumulated value.
      orig.width  = 2;
      orig.height = 2;
    }

    canvas = document.createElement('canvas');
    canvas.id        = 'flightTopCanvas';
    canvas.className = 'gc-field__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    startLoop();
  }

  function onRoundStart() {
    phase        = 'running';
    landYd       = 0;
    landProgress = 0;
    landAnim     = { active: false };
    crashDrop    = { active: false };
    resetTrajectory();
  }

  function onCashout(gs) {
    phase  = 'ended';
    landYd = (
      window.lastState?.liveDistanceYd
      || window.lastState?.distanceYd
      || gs?.liveDistanceYd
      || gs?.round?.finalDistanceYards
      || 0
    );
    // Start ball where it is right now and animate it along the remaining arc to ground
    const p0 = clamp01(
      gs?.round?.flightProgress
      ?? window.lastState?.round?.flightProgress
      ?? 0.5
    );
    landProgress = p0;
    const remaining = Math.max(0.05, 1.0 - p0);
    landAnim = { active: true, start: performance.now(), from: p0, duration: Math.round(300 + remaining * 750) };
  }

  function onCrash(gs) {
    // No separate crash visual — treat as normal landing (same as cashout)
    onCashout(gs);
  }

  function reset() {
    phase        = 'idle';
    landYd       = 0;
    landProgress = 0;
    landAnim     = { active: false };
    crashDrop    = { active: false };
    resetTrajectory();
  }

  function destroy() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (canvas?.parentElement) canvas.remove();
    canvas = null;
    ctx    = null;
  }

  return { mount, onRoundStart, onCashout, onCrash, reset, destroy };
}
