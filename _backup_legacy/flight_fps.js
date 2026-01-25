(function(){
  "use strict";

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => {
    const inv = 1 - clamp01(t);
    return 1 - inv * inv * inv;
  };

  function initFlightFPS(canvas, opts = {}){
    if(!canvas || !(canvas instanceof HTMLCanvasElement)){
      console.error("[flight_fps] canvas missing");
      return null;
    }
    const ctx = canvas.getContext("2d");
    let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    let w = 0, h = 0;
    let horizonY = 0;
    let fairway = { leftTop:0, rightTop:0, leftBottom:0, rightBottom:0 };
    const trail = [];
    const TRAIL_MAX = 26;
    const TRAIL_MAX_AGE = 900;
    let roundBias = 0;
    let landing = { active:false, start:0, baseX:0, targetX:0, duration:360 };
    let dust = [];
    let landingTriggered = false;

    function resize(){
      w = canvas.clientWidth || canvas.width || 640;
      h = canvas.clientHeight || canvas.height || 360;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      horizonY = h * 0.34;
      const fwTop = w * 0.18;
      const fwBottom = w * 0.46;
      fairway = {
        leftTop: (w - fwTop) * 0.5,
        rightTop: (w + fwTop) * 0.5,
        leftBottom: (w - fwBottom) * 0.5,
        rightBottom: (w + fwBottom) * 0.5
      };
    }

    function clear(){
      ctx.clearRect(0, 0, w, h);
    }

    function pickBias(gameState){
      const seed = Math.sin((gameState?.round?.startTsMs || Date.now()) * 0.001) * 43758.5453;
      const r = seed - Math.floor(seed);
      roundBias = lerp(-0.35, 0.35, r);
    }

    function startLanding(targetX){
      landing.active = true;
      landing.start = performance.now();
      landing.baseX = trail.length ? trail[trail.length - 1].x : w * 0.5;
      landing.targetX = Math.max(landing.baseX, targetX);
      landingTriggered = true;
    }

    function addDust(x, y){
      dust.push({ x, y, t: performance.now() });
      if(dust.length > 6) dust.shift();
    }

    function drawBackground(){
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0e1118");
      sky.addColorStop(1, "#06080d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const haze = ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 80);
      haze.addColorStop(0, "rgba(255,255,255,0)");
      haze.addColorStop(1, "rgba(120,150,190,0.18)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizonY - 20, w, 100);

      ctx.save();
      ctx.fillStyle = "#0d1511";
      ctx.beginPath();
      ctx.moveTo(fairway.leftBottom, h);
      ctx.lineTo(fairway.leftTop, horizonY);
      ctx.lineTo(fairway.rightTop, horizonY);
      ctx.lineTo(fairway.rightBottom, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, horizonY);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.restore();

      const vig = ctx.createRadialGradient(w*0.5, h*0.6, w*0.1, w*0.5, h*0.6, w*0.8);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    function drawDust(){
      const now = performance.now();
      for(let i=dust.length-1;i>=0;i--){
        const d = dust[i];
        const age = now - d.t;
        if(age > 500){ dust.splice(i,1); continue; }
        const p = clamp01(age / 500);
        const alpha = (1 - p) * 0.35;
        const r = 8 + 18 * p;
        ctx.fillStyle = `rgba(220,210,190,${alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI*2);
        ctx.fill();
      }
    }

    function drawTrail(now){
      if(!trail.length) return;
      while(trail.length > TRAIL_MAX || (now - trail[0].t) > TRAIL_MAX_AGE){
        trail.shift();
        if(!trail.length) return;
      }
      ctx.save();
      ctx.lineCap = "round";
      for(let i=1;i<trail.length;i++){
        const a = trail[i-1];
        const b = trail[i];
        const age = now - b.t;
        const t = clamp01(age / TRAIL_MAX_AGE);
        const alpha = (1 - t) * 0.35;
        const width = 2.4 - 1.4 * t;
        ctx.strokeStyle = `rgba(230,236,242,${alpha})`;
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
      const shadowY = Math.min(h * 0.92, pos.y + radius * 0.4);
      const shadowW = radius * 1.8;
      const shadowH = radius * 0.6;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(pos.x, shadowY, shadowW, shadowH, 0, 0, Math.PI*2);
      ctx.fill();

      const grad = ctx.createRadialGradient(pos.x - radius*0.2, pos.y - radius*0.2, radius*0.1, pos.x, pos.y, radius);
      grad.addColorStop(0, "rgba(245,246,247,1)");
      grad.addColorStop(1, "rgba(210,214,218,0.9)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    function computePos(gameState){
      const p = clamp01(gameState?.round?.flightProgress ?? 0);
      const arc = 4 * p * (1 - p);
      const bias = roundBias;
      const drift = bias * Math.pow(p, 1.6) * (w * 0.1);
      const baseX = w * 0.5 + drift;
      const groundY = h * 0.88;
      const y = lerp(groundY, horizonY + h*0.08, p) - arc * (h * 0.25);
      const scale = lerp(1.0, 0.08, p);

      if(landing.active){
        const t = clamp01((performance.now() - landing.start) / landing.duration);
        const fall = t*t;
        const lx = lerp(landing.baseX, landing.targetX, t);
        const ly = lerp(y, groundY, fall);
        if(t>=1){
          landing.active = false;
          addDust(lx, groundY);
        }
        return { x: lx, y: ly, scale: Math.max(0.06, scale * (1 - 0.3*t)) };
      }

      return { x: baseX, y, scale };
    }

    function render(gameState){
      resize();
      clear();
      drawBackground();
      const now = performance.now();
      const pos = computePos(gameState);
      trail.push({ x: pos.x, y: pos.y, t: now });
      drawTrail(now);
      drawBall(pos);
      drawDust();
    }

    function onRoundStart(gameState){
      trail.length = 0;
      dust.length = 0;
      landing.active = false;
      landingTriggered = false;
      pickBias(gameState);
    }

    function onCashout(gameState){
      if(landingTriggered) return;
      const p = clamp01(gameState?.round?.flightProgress ?? 1);
      const targetX = w * 0.5 + roundBias * Math.pow(p, 1.6) * (w * 0.1);
      startLanding(targetX);
    }

    function onCrash(gameState){
      onCashout(gameState);
    }

    function destroy(){
      trail.length = 0;
      dust.length = 0;
    }

    resize();
    return { render, onRoundStart, onCashout, onCrash, resize, destroy };
  }

  window.initFlightFPS = initFlightFPS;
})();
