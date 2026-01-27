(function(){
  "use strict";

  const TEMPO_ARC = {
    arcStartDeg: 210,
    arcEndDeg: 330,
    targetDeg: 270
  };

  const FALLBACK = { cx: 60, cy: 60, r: 54 };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const clamp01 = (v) => clamp(Number.isFinite(v) ? v : 0, 0, 1);
  const degToRad = (deg) => (deg * Math.PI) / 180;

  const ui = {
    ring: null,
    svg: null,
    base: null,
    sweet: null,
    runner: null,
    ball: null
  };

  let geom = { cx: FALLBACK.cx, cy: FALLBACK.cy, r: FALLBACK.r };
  let warnedMissing = false;

  function polarToCartesian(cx, cy, r, deg){
    const rad = degToRad(deg);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function describeArc(cx, cy, r, startDeg, endDeg){
    const start = polarToCartesian(cx, cy, r, startDeg);
    const end = polarToCartesian(cx, cy, r, endDeg);
    const sweep = endDeg - startDeg;
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep >= 0 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function clampArcDeg(deg){
    const start = TEMPO_ARC.arcStartDeg;
    const end = TEMPO_ARC.arcEndDeg;
    return clamp(deg, start, end);
  }

  function readGeometry(){
    if(!ui.svg) return;
    const viewBox = ui.svg.getAttribute("viewBox");
    if(viewBox){
      const parts = viewBox.split(/\s+/).map(Number);
      if(parts.length === 4 && parts.every(Number.isFinite)){
        const [minX, minY, w, h] = parts;
        const cx = minX + w / 2;
        const cy = minY + h / 2;
        const r = Math.max(0, Math.min(w, h) / 2 - 4);
        if(Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r) && r > 0){
          geom = { cx, cy, r };
          return;
        }
      }
    }
    geom = { ...FALLBACK };
  }

  function updateBase(){
    if(!ui.base) return;
    ui.base.setAttribute("d", describeArc(geom.cx, geom.cy, geom.r, TEMPO_ARC.arcStartDeg, TEMPO_ARC.arcEndDeg));
  }

  function updateSweet(sweetCenterDeg, sweetWidthDeg){
    if(!ui.sweet) return;
    const half = Math.max(2, (Number(sweetWidthDeg) || 18) / 2);
    const center = Number.isFinite(sweetCenterDeg) ? sweetCenterDeg : TEMPO_ARC.targetDeg;
    const start = clampArcDeg(center - half);
    const end = clampArcDeg(center + half);
    ui.sweet.setAttribute("d", describeArc(geom.cx, geom.cy, geom.r, start, end));
  }

  function updateRunner(headPos01){
    if(!ui.runner) return;
    const v = clamp01(headPos01);
    const span = TEMPO_ARC.arcEndDeg - TEMPO_ARC.arcStartDeg;
    const deg = TEMPO_ARC.arcStartDeg + span * v;
    const pos = polarToCartesian(geom.cx, geom.cy, geom.r, deg);
    if(!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    ui.runner.setAttribute("cx", pos.x.toFixed(2));
    ui.runner.setAttribute("cy", pos.y.toFixed(2));
  }

  function updateBall(){
    if(!ui.ball) return;
    const pos = polarToCartesian(geom.cx, geom.cy, geom.r, TEMPO_ARC.targetDeg);
    if(!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    ui.ball.setAttribute("cx", pos.x.toFixed(2));
    ui.ball.setAttribute("cy", pos.y.toFixed(2));
  }

  function init(){
    ui.ring = document.getElementById("alignmentRing");
    ui.svg = document.getElementById("alignmentSvg");
    ui.base = document.getElementById("alignmentBase");
    ui.sweet = document.getElementById("alignmentSweet");
    ui.runner = document.getElementById("alignmentRunner");
    ui.ball = document.getElementById("alignmentBall");
    if(!ui.svg || !ui.base || !ui.sweet || !ui.runner){
      if(!warnedMissing){
        console.warn("[SwingPath] Missing alignment SVG elements");
        warnedMissing = true;
      }
      return;
    }
    readGeometry();
    updateBase();
    updateSweet(TEMPO_ARC.targetDeg, 18);
    updateBall();
    updateRunner(0);
  }

  function setHolding(isHolding){
    if(!ui.ring) return;
    ui.ring.classList.toggle("is-holding", !!isHolding);
  }

  function update({ phase, headPos01, sweetCenter = 0, sweetWidthDeg = 18 } = {}){
    if(!ui.svg) return;
    const holding = phase === "ARMING";
    setHolding(holding);
    readGeometry();
    updateBase();
    const sweetCenterDeg = TEMPO_ARC.targetDeg + (Number(sweetCenter) || 0);
    updateSweet(sweetCenterDeg, sweetWidthDeg);
    updateBall();
    if(holding) updateRunner(headPos01);
  }

  window.SwingPath = { init, update, setHolding };
})();
