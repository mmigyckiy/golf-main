/*
 * UI fit architecture (single source of truth):
 * - `#uiFitViewport` is responsible for viewport clipping + horizontal centering.
 * - `#uiFit` is responsible for transform-based scaling only.
 * - This module is the only place that computes and applies fit state.
 */

const DEFAULT_DESIGN_W = 1260;
const DEFAULT_DESIGN_H = 467;

const fitState = {
  scale: 1,
  designW: DEFAULT_DESIGN_W,
  designH: DEFAULT_DESIGN_H,
  vpW: 0,
  vpH: 0
};

const runtime = {
  inited: false,
  rafId: 0,
  options: {
    allowUpscale: false,
    designW: undefined,
    designH: undefined
  }
};

function toPositiveNumber(value){
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstPositive(...values){
  for(const value of values){
    const parsed = toPositiveNumber(value);
    if(parsed != null){
      return parsed;
    }
  }
  return null;
}

function getNodes(){
  const viewport = document.getElementById("uiFitViewport");
  const fit = document.getElementById("uiFit");
  return { viewport, fit };
}

function resolveDesignSize(fit){
  const dataset = fit?.dataset || {};
  const designW = firstPositive(
    runtime.options.designW,
    dataset.designW,
    dataset.designw,
    dataset.designWidth,
    fit?.getAttribute?.("data-design-w"),
    fit?.getAttribute?.("data-designW"),
    fit?.getAttribute?.("data-design-width")
  ) || DEFAULT_DESIGN_W;
  const designH = firstPositive(
    runtime.options.designH,
    dataset.designH,
    dataset.designh,
    dataset.designHeight,
    fit?.getAttribute?.("data-design-h"),
    fit?.getAttribute?.("data-designH"),
    fit?.getAttribute?.("data-design-height")
  ) || DEFAULT_DESIGN_H;
  return { designW, designH };
}

function applyViewportStyles(viewport){
  viewport.style.position = viewport.style.position || "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100vh";
  viewport.style.overflowY = "auto";
  viewport.style.overflowX = "hidden";
  viewport.style.display = "flex";
  viewport.style.justifyContent = "center";
  viewport.style.alignItems = "flex-start";
}

export function applyUiFit() {
  const { viewport, fit } = getNodes();
  if(!viewport || !fit){
    return getUiFitState();
  }

  applyViewportStyles(viewport);

  const { designW, designH } = resolveDesignSize(fit);
  const rect = viewport.getBoundingClientRect();
  const vpW = Math.max(1, Math.floor(rect.width));
  const vpH = Math.max(1, Math.floor(rect.height));

  let scale = Math.min(vpW / designW, vpH / designH);
  if(!runtime.options.allowUpscale){
    scale = Math.min(1, scale);
  }
  if(!Number.isFinite(scale) || scale <= 0){
    scale = 1;
  }

  fit.style.width = `${designW}px`;
  fit.style.height = `${designH}px`;
  fit.style.transformOrigin = "top center";
  fit.style.transform = `translateZ(0) scale(${scale})`;
  fit.style.setProperty("--ui-scale", String(scale));

  fitState.scale = scale;
  fitState.designW = designW;
  fitState.designH = designH;
  fitState.vpW = vpW;
  fitState.vpH = vpH;

  if(window.__UI_FIT_DEBUG__ === true){
    console.log("[ui_fit]", getUiFitState());
  }

  return getUiFitState();
}

function scheduleApply(){
  if(runtime.rafId){
    return;
  }
  runtime.rafId = requestAnimationFrame(() => {
    runtime.rafId = 0;
    applyUiFit();
  });
}

export function initUiFit(options = {}) {
  runtime.options = {
    ...runtime.options,
    ...options
  };

  window.__applyUiFit = applyUiFit;
  window.__getUiFitState = getUiFitState;

  if(!runtime.inited){
    window.addEventListener("resize", scheduleApply, { passive: true });
    if(document.readyState === "loading"){
      window.addEventListener("DOMContentLoaded", scheduleApply, { once: true });
    }
    runtime.inited = true;
  }

  scheduleApply();
  return getUiFitState();
}

export function getUiFitState() {
  return { ...fitState };
}

