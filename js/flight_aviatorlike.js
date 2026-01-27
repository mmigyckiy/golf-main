// DEAD-CODE CANDIDATES (not removed yet):
// - none found
(function(){
  "use strict";

  window.__DRIVIX_RENDER_DEBUG__ = window.__DRIVIX_RENDER_DEBUG__ || {
    noGlow: false,
    noTrail: false,
    forceSourceOver: true,
    fullClear: true,
    logComposite: false
  };
  const dbg = () => window.__DRIVIX_RENDER_DEBUG__;

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => {
    const c = clamp01(t);
    const inv = 1 - c;
    return 1 - inv * inv * inv;
  };
  let hud = {
    distanceYd: 0,
    tempoPct: 0,
    windMph: 0,
    windDirDeg: 0,
    roundState: "IDLE",
    endedFlashT0: 0,
    lastStateHash: ""
  };

  window.setFlightHUD = function(payload){
    try{
      if(!payload) return;
      hud.distanceYd = Number(payload.distanceYd ?? hud.distanceYd) || 0;
      hud.tempoPct = Number(payload.tempoPct ?? hud.tempoPct) || 0;
      hud.windMph = Number(payload.windMph ?? hud.windMph) || 0;
      hud.windDirDeg = Number(payload.windDirDeg ?? hud.windDirDeg) || 0;
      hud.roundState = String(payload.roundState ?? hud.roundState);
      const ended = hud.roundState && hud.roundState !== "RUNNING";
      if(ended){
        if(!hud.endedFlashT0) hud.endedFlashT0 = performance.now();
      }else{
        hud.endedFlashT0 = 0;
      }
    }catch(err){
      console.error("[setFlightHUD] failed", err);
    }
  };

    function initFlightAviatorLike(canvas, opts = {}){
    if(!canvas || !(canvas instanceof HTMLCanvasElement)){
      console.error("[flight_aviator] canvas missing");
      return null;
    }

    window.addEventListener("keydown", (e) => {
      if(e.key === "g") dbg().noGlow = !dbg().noGlow;
      if(e.key === "t") dbg().noTrail = !dbg().noTrail;
      if(e.key === "c") dbg().fullClear = !dbg().fullClear;
      if(e.key === "l") dbg().logComposite = !dbg().logComposite;
      if(e.key === "s") dbg().forceSourceOver = !dbg().forceSourceOver;
      console.log("[RENDER DEBUG]", JSON.stringify(dbg()));
    });
    const ctx = canvas.getContext("2d");
    let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    let w = 0, h = 0;
    let horizonY = 0;
    let groundStartY = 0;
    const trail = [];
    const dust = [];
    const rings = [];
    const bands = 6;
    const TRAIL_MAX = 14;
    const TRAIL_MAX_AGE = 320;
    const VISUAL_MS = opts.visualMs || 2200;
    let lastState = null;
    let bias = 0;
    let rafId = null;
    const crash = { active:false, start:0, duration:520, fromY:0, x:0, rollTarget:0 };
    const flash = { active:false, start:0, duration:140 };
    const exit = { active:false, start:0, fromX:0, fromY:0, duration:820 };
    const landing = { active:false, x:0, y:0, ts:0, kind:"cashout" };
    const trailFade = { active:false, start:0, duration:220, freeze:false };
    let frozenCurveProgress = 0;
    let lastRenderProgress = 0;
    let lastRenderPos = null;
    let lastRoundKey = null;
    let didFreezeOnStop = false;
    let lastCompositeLog = 0;

    function resize(){
      w = canvas.clientWidth || canvas.width || 640;
      h = canvas.clientHeight || canvas.height || 360;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      horizonY = Math.round(h * 0.30);
      groundStartY = horizonY;
    }

    function pickBias(gameState){
      const override = gameState?.round?.bias;
      if(Number.isFinite(override)){
        bias = Math.max(-0.4, Math.min(0.4, override));
        return;
      }
      const seedSrc = gameState?.round?.startTsMs || Date.now();
      const seed = Math.sin(seedSrc * 0.001) * 43758.5453123;
      const r = seed - Math.floor(seed);
      bias = lerp(-0.3, 0.3, r);
    }

    function addDust(x, y){
      dust.push({ x, y, t: performance.now() });
      if(dust.length > 6) dust.shift();
    }

    function addRing(x, y){
      rings.push({ x, y, t: performance.now() });
      if(rings.length > 4) rings.shift();
    }

    function setLanding(pos, kind = "cashout"){
      landing.active = true;
      landing.x = pos.x;
      landing.y = pos.y;
      landing.ts = performance.now();
      landing.kind = kind;
    }

    function startCrash(pos){
      crash.active = true;
      crash.start = performance.now();
      crash.fromY = pos.y;
      crash.x = pos.x;
      crash.rollTarget = Math.min(w * 0.94, pos.x + w * 0.02);
      flash.active = true;
      flash.start = crash.start;
      addDust(pos.x, h * 0.86);
      addRing(pos.x, h * 0.86);
      setLanding(pos, "crash");
      trailFade.active = true;
      trailFade.start = crash.start;
      trailFade.freeze = true;
      startExit(pos);
    }

    function drawBackground(){
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, "#1c242c");
      sky.addColorStop(1, "#121a24");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizonY);

      // Thin horizon line
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, horizonY, w, 1);

      // Ground
      const ground = ctx.createLinearGradient(0, groundStartY, 0, h);
      ground.addColorStop(0, "#0d1512");
      ground.addColorStop(1, "#0c130e");
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundStartY, w, h - groundStartY);

      // Perspective mow lines (subtle)
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for(let i=-3;i<=3;i++){
        const xTop = w * 0.5 + i * w * 0.05;
        const xBottom = w * 0.5 + i * w * 0.14;
        ctx.beginPath();
        ctx.moveTo(xBottom, h);
        ctx.lineTo(xTop, horizonY + 50);
        ctx.stroke();
      }
      ctx.restore();

      // Bottom vignette
      const vig = ctx.createRadialGradient(w*0.5, h*0.85, w*0.1, w*0.5, h*0.85, w*0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    function startExit(pos){
      exit.active = true;
      exit.start = performance.now();
      exit.fromX = pos.x;
      exit.fromY = pos.y;
      exit.duration = 820;
      trailFade.active = true;
      trailFade.start = exit.start;
      trailFade.freeze = true;
    }

    function computePos(gameState){
      const now = performance.now();
      const pRaw = gameState?.round?.flightProgress;
      const elapsed = gameState?.round?.elapsedMs;
      const p = clamp01(typeof pRaw === "number" ? pRaw : ((elapsed || 0) / VISUAL_MS));
      const groundY = h * 0.86;
      const topY = h * 0.18;
      const arc = 1 - Math.exp(-2.2 * p);
      const wobble = Math.sin(now * 0.0014 + p * 6) * 3;
      const y = lerp(groundY, topY, arc) + wobble;
      const startX = w * 0.06;
      const endX = w * 0.94;
      const drift = bias * Math.pow(p, 1.6) * (w * 0.12);
      const driftExtra = bias * Math.pow(p, 1.1) * (w * 0.07);
      const x = lerp(startX, endX, p) + drift + driftExtra;
      const scale = lerp(1, 0.12, p);
      const snapX = Math.min(endX, Math.max(startX, x));

      if(exit.active){
        const vp = { x: Math.round(w * 0.82), y: Math.round(h * 0.28) };
        const t = clamp01((now - exit.start) / exit.duration);
        const e = 1 - Math.pow(1 - t, 3);
        let ex = lerp(exit.fromX, vp.x, e);
        let ey = lerp(exit.fromY, vp.y, e);
        const drift = (e * e);
        ex += drift * 6;
        ey -= drift * 2;
        if(t >= 1){
          // end of exit
          exit.active = false;
          trail.length = 0;
        }
        return { x: ex, y: ey, scale: lerp(1.0, 0.18, e), alpha: 1 - e, exit:true, progress:p };
      }

      if(crash.active){
        const t = clamp01((now - crash.start) / crash.duration);
        const fall = easeOutCubic(t);
        const dropY = lerp(crash.fromY, groundY, fall);
        const roll = lerp(crash.x, crash.rollTarget, fall);
        if(t >= 1){
          crash.active = false;
          addDust(roll, groundY);
          addRing(roll, groundY);
          startExit({ x: roll, y: dropY });
        }
        return { x: roll, y: dropY, scale: Math.max(0.08, scale * (1 - 0.3 * fall)), progress:p };
      }
      return { x: snapX, y, scale, progress:p };
    }

    function drawCurve(progress, ended){
      if(progress <= 0.002) return;
      const startX = w * 0.06;
      const endX = w * 0.94;
      const groundY = h * 0.86;
      const topY = h * 0.18;
      ctx.save();
      ctx.lineWidth = 2;
      const samples = 60;
      // Halo
      ctx.strokeStyle = "rgba(232,236,241,0.10)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for(let i=0;i<=samples;i++){
        const t = i / samples;
        if(t > progress) break;
        const tp = t;
        const arc = 1 - Math.exp(-2.2 * tp);
        const drift = bias * Math.pow(tp, 1.6) * (w * 0.12);
        const driftExtra = bias * Math.pow(tp, 1.1) * (w * 0.07);
        const x = lerp(startX, endX, tp) + drift + driftExtra;
        const y = lerp(groundY, topY, arc);
        if(i===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Main stroke
      ctx.strokeStyle = "rgba(232,236,241,0.26)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0;i<=samples;i++){
        const t = i / samples;
        if(t > progress) break;
        const tp = t;
        const arc = 1 - Math.exp(-2.2 * tp);
        const drift = bias * Math.pow(tp, 1.6) * (w * 0.12);
        const driftExtra = bias * Math.pow(tp, 1.1) * (w * 0.07);
        const x = lerp(startX, endX, tp) + drift + driftExtra;
        const y = lerp(groundY, topY, arc);
        if(i===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if(!ended){
        // Optional head indicator could go here; currently disabled for ended/crash
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    function drawTrail(now, progress){
      if(dbg().noTrail) return;
      if(!trail.length) return;
      const EPS = 0.001;
      const usable = trail.filter(p => (p.p ?? 0) <= (progress + EPS));
      if(!usable.length) return;
      const trimmed = usable.slice(-24);
      const alignedBoost = lastState?.round?.faceAlignedAtRelease ? 0.05 : 0;
      ctx.save();
      ctx.lineCap = "round";
      for(let i=1;i<trimmed.length;i++){
        const a = trimmed[i-1];
        const b = trimmed[i];
        const age = now - b.t;
        const t = clamp01(age / TRAIL_MAX_AGE);
        const fade = Math.pow(1 - t, 2);
        const width = lerp(1.2, 2.4, i / trimmed.length);
        ctx.strokeStyle = `rgba(230,236,242,${(0.28 + alignedBoost) * fade})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBall(pos){
      const radius = 10 * pos.scale;
      const shadowY = Math.min(h * 0.92, pos.y + radius * 0.6);
      const shadowW = radius * 2.2;
      const shadowH = radius * 0.6;
      const alpha = pos.alpha !== undefined ? pos.alpha : 1;
      const roundState = lastState?.round?.state;
      const ended = roundState && roundState !== "RUNNING";
      const flatFill = crash.active || exit.active || pos.exit || ended;
      const allowGlow = !dbg().noGlow && !ended && !crash.active && !exit.active;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = allowGlow ? 0 : 0;
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(pos.x, shadowY, shadowW, shadowH, 0, 0, Math.PI*2);
      ctx.fill();

      const fillColor = flatFill ? "#e6e8eb" : "#f6f7f8";
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,24,28,0.35)";
      ctx.lineWidth = Math.max(0.6, radius * 0.16);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.restore();
    }

    function drawDust(){
      const now = performance.now();
      for(let i=dust.length-1;i>=0;i--){
        const d = dust[i];
        const age = now - d.t;
        if(age > 650){ dust.splice(i,1); continue; }
        const p = clamp01(age / 650);
        const alpha = (1 - p) * 0.28;
        const r = 10 + 24 * p;
        ctx.fillStyle = `rgba(214,206,192,${alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
    }

    function drawRings(){
      const now = performance.now();
      for(let i=rings.length-1;i>=0;i--){
        const r = rings[i];
        const age = now - r.t;
        if(age > 520){ rings.splice(i,1); continue; }
        const p = clamp01(age / 520);
        const alpha = (1 - p) * 0.32;
        const radius = 8 + 38 * p;
        ctx.strokeStyle = `rgba(216,200,166,${alpha})`;
        ctx.lineWidth = 1.2 - 0.8 * p;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
    }

    function drawLandingMarker(){
      if(!landing.active) return;
      const now = performance.now();
      const t = clamp01((now - landing.ts) / 500);
      const e = 1 - Math.pow(1 - t, 3);
      const ringR = lerp(6, 14, e);
      const ringA = (1 - t) * 0.35;
      const dotR = 4;
      ctx.save();
      ctx.strokeStyle = `rgba(216,200,166,${ringA})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(landing.x, landing.y, ringR, 0, Math.PI*2);
      ctx.stroke();
      ctx.fillStyle = "rgba(240,242,246,0.9)";
      ctx.beginPath();
      ctx.arc(landing.x, landing.y, dotR, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    function drawLandingMarkerStatic(){
      if(!landing.active) return;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 0;
      ctx.filter = "none";
      ctx.fillStyle = "rgba(216,200,166,0.6)";
      ctx.beginPath();
      ctx.arc(landing.x, landing.y, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    function drawFlash(){
      if(!flash.active) return;
      const age = performance.now() - flash.start;
      const p = clamp01(age / flash.duration);
      const alpha = (1 - p) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, w, h);
      if(p >= 1) flash.active = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
    }

    function draw(gameState){
      if(Number.isFinite(gameState?.round?.bias)){
        bias = Math.max(-0.4, Math.min(0.4, gameState.round.bias));
      }
      if(dbg().forceSourceOver){
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.filter = "none";
      }
      if(dbg().fullClear){
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const roundState = gameState?.round?.state || lastState?.round?.state;
      const ended = roundState && roundState !== "RUNNING";
      const nowLog = performance.now();
      if(dbg().logComposite && nowLog - lastCompositeLog > 1000){
        console.log("[RENDER]", ctx.globalCompositeOperation, ctx.globalAlpha, ctx.filter);
        lastCompositeLog = nowLog;
      }

      resize();
      drawBackground();
      const now = performance.now();
      const pos = computePos(gameState || lastState || {});
      const pRaw = clamp01(pos.progress ?? 0);
      const roundId = gameState?.round?.id || gameState?.round?.startTs || gameState?.round?.seed || null;
      if(roundId && roundId !== lastRoundKey){
        lastRoundKey = roundId;
        lastRenderProgress = 0;
        lastRenderPos = null;
        didFreezeOnStop = false;
      }
      const fxAllowed = !ended && !crash.active && !exit.active && !pos.exit;
      const hardStop = ended || crash.active || exit.active || pos.exit;
      if(fxAllowed){
        frozenCurveProgress = pRaw;
      }
      if(!hardStop && pRaw < 0.01 && lastRenderProgress > 0.2){
        lastRenderProgress = 0;
        lastRenderPos = null;
        didFreezeOnStop = false;
      }
      if(!hardStop){
        lastRenderProgress = Math.max(lastRenderProgress, pRaw);
      }
      const pRender = hardStop ? lastRenderProgress : Math.max(lastRenderProgress, pRaw);
      const isPosValid = Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.scale);
      const rolledBack = lastRenderPos && (pRaw + 0.0005 < (lastRenderPos.progress ?? 0));
      let posForRender = pos;
      if(!hardStop){
        if(!isPosValid || rolledBack) posForRender = lastRenderPos || pos;
        lastRenderPos = { ...posForRender, progress: pRender };
        didFreezeOnStop = false;
      }else{
        if(!didFreezeOnStop && lastRenderPos){
          lastRenderPos = { ...lastRenderPos, progress: pRender };
          didFreezeOnStop = true;
        }
        posForRender = lastRenderPos || { ...pos, progress: pRender };
      }
      const pDraw = hardStop ? frozenCurveProgress : pRender;
      if(roundState === "RUNNING" && !hardStop){
        const liveDist = Math.round(500 * clamp01(pRender));
        window.__DRIVIX_LIVE_DIST__ = liveDist;
      }
      if(!ended && !pos.exit && !exit.active && !trailFade.freeze){
        trail.push({ x: posForRender.x, y: posForRender.y, t: now, p: pRender });
        while(trail.length > TRAIL_MAX) trail.shift();
        while(trail.length && (now - trail[0].t) > TRAIL_MAX_AGE) trail.shift();
      }
      drawCurve(pDraw, ended || crash.active || exit.active || pos.exit);
      if(!ended) drawTrail(now, pRender);
      drawBall(posForRender);
      drawHudOverlay(now);
      if(fxAllowed){
        drawDust();
        drawRings();
        drawFlash();
        drawLandingMarker();
      }else{
        drawLandingMarkerStatic();
      }
    }

    function loop(){
      if(!lastState){ rafId = null; return; }
      draw(lastState);
      const animating = crash.active || flash.active || dust.length || rings.length || exit.active;
      if(animating){
        rafId = window.requestAnimationFrame(loop);
      }else{
        rafId = null;
      }
    }

    function render(gameState){
      lastState = gameState || lastState;
      draw(gameState);
    }

    function onRoundStart(gameState){
      lastState = gameState || lastState;
      trail.length = 0;
      dust.length = 0;
      rings.length = 0;
      crash.active = false;
      flash.active = false;
      exit.active = false;
      landing.active = false;
      trailFade.active = false;
      trailFade.freeze = false;
      pickBias(gameState);
      render(gameState);
    }

    function onCashout(gameState){
      lastState = gameState || lastState;
      const pos = computePos(lastState || {});
      setLanding(pos, "cashout");
      startExit(pos);
      if(!rafId) render(lastState);
    }

    function onCrash(gameState){
      lastState = gameState || lastState;
      const pos = computePos(lastState || {});
      startCrash(pos);
      if(!rafId) rafId = window.requestAnimationFrame(loop);
    }

    function roundRect(ctx, x, y, w2, h2, r){
      const rr = Math.min(r, Math.min(w2, h2) / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w2 - rr, y);
      ctx.quadraticCurveTo(x + w2, y, x + w2, y + rr);
      ctx.lineTo(x + w2, y + h2 - rr);
      ctx.quadraticCurveTo(x + w2, y + h2, x + w2 - rr, y + h2);
      ctx.lineTo(x + rr, y + h2);
      ctx.quadraticCurveTo(x, y + h2, x, y + h2 - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    }

    function drawWindArrow(cx, cy, deg, color){
      const rad = (deg - 90) * Math.PI / 180;
      const len = 16;
      const x2 = cx + Math.cos(rad) * len;
      const y2 = cy + Math.sin(rad) * len;
      const wing = 5;
      const back = 6;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const a1 = rad + Math.PI * 0.82;
      const a2 = rad - Math.PI * 0.82;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(a1) * wing - Math.cos(rad) * back, y2 + Math.sin(a1) * wing - Math.sin(rad) * back);
      ctx.lineTo(x2 + Math.cos(a2) * wing - Math.cos(rad) * back, y2 + Math.sin(a2) * wing - Math.sin(rad) * back);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawHudOverlay(now){
      const pad = 18;
      const boxW = Math.min(320, w * 0.34);
      const boxH = 102;
      const x = w - boxW - pad;
      const y = h - boxH - pad;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      const grad = ctx.createLinearGradient(x, y, x, y + boxH);
      grad.addColorStop(0, "rgba(20,24,28,0.55)");
      grad.addColorStop(1, "rgba(10,12,16,0.32)");
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, boxW, boxH, 18);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const labelC = "rgba(230,236,242,0.55)";
      const valueC = "rgba(230,236,242,0.92)";
      const accentC = "rgba(210,170,90,0.95)";
      ctx.font = "600 11px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = labelC;

      const col1x = x + 16;
      const col2x = x + boxW * 0.52;
      const row1y = y + 26;
      const row2y = y + 64;

      ctx.fillText("DISTANCE", col1x, row1y);
      ctx.font = "700 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = accentC;
      ctx.fillText(`${Math.round(hud.distanceYd)} yd`, col1x, row1y + 28);

      ctx.font = "600 11px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = labelC;
      ctx.fillText("SWING TEMPO", col2x, row1y);
      ctx.font = "700 16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = valueC;
      ctx.fillText(`${Math.round(hud.tempoPct)}%`, col2x, row1y + 24);

      ctx.font = "600 11px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = labelC;
      ctx.fillText("WIND", col2x, row2y);
      ctx.font = "700 16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillStyle = valueC;
      const mph = Math.round(hud.windMph);
      ctx.fillText(`${mph} mph`, col2x, row2y + 24);
      drawWindArrow(col2x + 92, row2y + 16, hud.windDirDeg, valueC);
      ctx.restore();

      if(hud.endedFlashT0){
        const dt = now - hud.endedFlashT0;
        const dur = 1100;
        if(dt < dur){
          const t = dt / dur;
          const a = (t < 0.2) ? (t / 0.2) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
          ctx.save();
          ctx.globalAlpha = 0.92 * a;
          ctx.fillStyle = "rgba(10,12,14,0.35)";
          ctx.filter = "none";
          const txt = `${Math.round(hud.distanceYd)} yd`;
          ctx.font = "800 56px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
          const tw = ctx.measureText(txt).width;
          const tx = (w - tw) / 2;
          const ty = h * 0.38;
          ctx.fillText(txt, tx + 2, ty + 2);
          ctx.fillStyle = "rgba(230,236,242,0.95)";
          ctx.fillText(txt, tx, ty);
          ctx.restore();
        }else{
          hud.endedFlashT0 = 0;
        }
      }
    }

    function destroy(){
      if(rafId){
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      trail.length = 0;
      dust.length = 0;
      rings.length = 0;
    }

    resize();
    return { render, onRoundStart, onCashout, onCrash, resize, destroy };
  }

  window.initFlightAviatorLike = initFlightAviatorLike;
})();
