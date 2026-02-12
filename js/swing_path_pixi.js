/**
 * Swing Path Pixi — Premium Arc Renderer
 * Keeps architecture intact: mounts to #pathPixi and exposes SwingPathPixi API.
 */
(function() {
  "use strict";

  const ARC_START = Math.PI; // left
  const ARC_END = 0;         // right
  const FOLLOW_LERP = 0.14;
  const DEBUG_PATH_BOUNDS = false;

  const COLORS = {
    gold: 0xd8c8a6,
    white: 0xffffff,
    black: 0x000000,
    graphite: 0x626d7a
  };

  let app = null;
  let hostEl = null;
  let resizeTargetEl = null;
  let root = null;
  let pathStage = null;
  let layers = null;
  let resizeObserver = null;
  let onWindowResize = null;
  let mounted = false;

  let targetT = 0.5;
  let runnerT = 0.5;
  let sweetStart01 = 0.40;
  let sweetEnd01 = 0.60;
  let intensity01 = 0.5;

  function clamp01(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function snapHalf(v) {
    return Math.round(v * 2) / 2;
  }

  function ensurePixi() {
    return !!(window.PIXI && typeof window.PIXI.Application === "function");
  }

  function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function getBlurFilterClass() {
    if (!window.PIXI) return null;
    return window.PIXI.BlurFilter || window.PIXI.filters?.BlurFilter || null;
  }

  function getElementSize(el) {
    if (!el) return { width: 1, height: 1 };
    const rect = el.getBoundingClientRect();
    const width = Math.max(1, Math.floor(el.clientWidth || rect.width || 1));
    const height = Math.max(1, Math.floor(el.clientHeight || rect.height || 1));
    return { width, height };
  }

  function computeLayout() {
    const w = Math.max(1, app?.screen?.width || app?.renderer?.width || 1);
    const h = Math.max(1, app?.screen?.height || app?.renderer?.height || 1);
    const pad = Math.min(w, h) * 0.10;
    const cx = w * 0.5;
    const cy = h * 0.62;
    const desiredR = Math.min(w, h) * 0.42;
    const maxBySides = Math.max(1, w * 0.5 - pad);
    const maxByTop = Math.max(1, cy - pad);
    const r = Math.max(12, Math.min(desiredR, maxBySides, maxByTop));
    return { w, h, cx, cy, r, pad };
  }

  function pointOnArc(layout, t01) {
    const t = clamp01(t01);
    const angle = ARC_START + (ARC_END - ARC_START) * t;
    return {
      x: layout.cx + Math.cos(angle) * layout.r,
      y: layout.cy - Math.sin(angle) * layout.r,
      angle
    };
  }

  function drawArcSegment(gfx, layout, from01, to01, steps = 96) {
    const a = clamp01(from01);
    const b = clamp01(to01);
    const s = Math.max(2, steps | 0);
    for (let i = 0; i <= s; i += 1) {
      const t = a + (b - a) * (i / s);
      const p = pointOnArc(layout, t);
      if (i === 0) gfx.moveTo(p.x, p.y);
      else gfx.lineTo(p.x, p.y);
    }
  }

  function buildLayers() {
    if (!pathStage) return;
    pathStage.removeChildren();

    layers = {
      baseOuter: new PIXI.Graphics(),
      baseInner: new PIXI.Graphics(),
      rimArc: new PIXI.Graphics(),
      sweetGlow: new PIXI.Graphics(),
      sweetArc: new PIXI.Graphics(),
      energyArc: new PIXI.Graphics(),
      runnerGlow: new PIXI.Graphics(),
      runner: new PIXI.Graphics(),
      debug: new PIXI.Graphics()
    };

    const BlurFilter = getBlurFilterClass();
    if (BlurFilter) {
      layers.sweetGlow.filters = [new BlurFilter(4)];
      layers.runnerGlow.filters = [new BlurFilter(1.8)];
    }

    pathStage.addChild(layers.baseOuter);
    pathStage.addChild(layers.baseInner);
    pathStage.addChild(layers.rimArc);
    pathStage.addChild(layers.sweetGlow);
    pathStage.addChild(layers.sweetArc);
    pathStage.addChild(layers.energyArc);
    pathStage.addChild(layers.runnerGlow);
    pathStage.addChild(layers.runner);
    if (DEBUG_PATH_BOUNDS) pathStage.addChild(layers.debug);

    layers.runnerGlow.clear();
    layers.runnerGlow.beginFill(COLORS.gold, 1);
    layers.runnerGlow.drawCircle(0, 0, 10);
    layers.runnerGlow.endFill();
    layers.runnerGlow.alpha = 0.06;

    layers.runner.clear();
    layers.runner.beginFill(COLORS.white, 0.96);
    layers.runner.drawCircle(0, 0, 7);
    layers.runner.endFill();
    layers.runner.beginFill(COLORS.white, 0.58);
    layers.runner.drawCircle(-2, -2, 2.2);
    layers.runner.endFill();
    layers.runner.filters = null;
    layers.runner.cacheAsBitmap = true;
  }

  function drawFrame() {
    if (!app || !layers) return;

    const layout = computeLayout();
    const s0 = Math.min(sweetStart01, sweetEnd01);
    const s1 = Math.max(sweetStart01, sweetEnd01);
    const inSweet = runnerT >= s0 && runnerT <= s1;

    // Calm tube base: darker shell + inner graphite + subtle rim.
    layers.baseOuter.clear();
    layers.baseOuter.lineStyle(16, COLORS.black, 0.24);
    drawArcSegment(layers.baseOuter, layout, 0, 1);

    layers.baseInner.clear();
    layers.baseInner.lineStyle(12, COLORS.graphite, 0.24);
    drawArcSegment(layers.baseInner, layout, 0, 1);

    layers.rimArc.clear();
    layers.rimArc.lineStyle(6, COLORS.white, 0.18);
    drawArcSegment(layers.rimArc, layout, 0, 1);

    // Sweet window: short gold segment near top-middle with soft glow.
    layers.sweetGlow.clear();
    layers.sweetGlow.lineStyle(14, COLORS.gold, 0.14);
    drawArcSegment(layers.sweetGlow, layout, s0, s1);

    layers.sweetArc.clear();
    layers.sweetArc.lineStyle(8, COLORS.gold, 0.62);
    drawArcSegment(layers.sweetArc, layout, s0, s1);

    // Energy ribbon near runner, trailing along movement direction.
    const trail = 0.11 + intensity01 * 0.09;
    const e0 = clamp01(runnerT - trail);
    const e1 = clamp01(runnerT);
    layers.energyArc.clear();
    layers.energyArc.lineStyle(5, COLORS.gold, 0.55 + intensity01 * 0.25);
    drawArcSegment(layers.energyArc, layout, e0, e1, 48);

    // Runner ball + subtle under-glow.
    const p = pointOnArc(layout, runnerT);
    const px = snapHalf(p.x);
    const py = snapHalf(p.y);
    layers.runnerGlow.position.set(px, py);
    layers.runnerGlow.scale.set(inSweet ? 1.15 : 0.95);
    layers.runnerGlow.alpha = inSweet ? 0.16 : 0.06;

    layers.runner.position.set(px, py);

    if (DEBUG_PATH_BOUNDS) {
      layers.debug.clear();
      layers.debug.lineStyle(1, 0xff4466, 0.9);
      layers.debug.drawRect(0, 0, layout.w, layout.h);
      layers.debug.beginFill(0x44d4ff, 0.95);
      layers.debug.drawCircle(layout.cx, layout.cy, 3);
      layers.debug.endFill();
    }

    app.render();
  }

  function stepRunner(dtMs) {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 16.67;
    const alpha = 1 - Math.pow(1 - FOLLOW_LERP, dt / 16.67);
    runnerT += (targetT - runnerT) * alpha;
    runnerT = clamp01(runnerT);
  }

  function resizeTo(width, height) {
    if (!app) return;
    app.renderer.resize(width, height);
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    drawFrame();
  }

  function resize() {
    if (!app) return;
    const size = getElementSize(resizeTargetEl || hostEl);
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    resizeTo(width, height);
  }

  function resolveResizeTarget(mountEl) {
    const cardBody =
      mountEl?.closest?.(".metricCard--path")?.querySelector?.(":scope > .metricCard__body") ||
      mountEl?.closest?.(".metricCard--path")?.querySelector?.(".metricCard__body");
    return (
      cardBody ||
      mountEl?.closest?.(".metricCard__body") ||
      mountEl?.closest?.(".swing-metric__body") ||
      mountEl
    );
  }

  function initSwingPathPixi(opts = {}) {
    const mountEl = opts.containerEl || document.getElementById("pathPixi");
    if (!mountEl) return false;
    if (!ensurePixi()) return false;

    destroy();

    hostEl = mountEl;
    hostEl.classList.add("metricStage", "metricStage--pixi");
    hostEl.setAttribute("aria-hidden", "true");
    resizeTargetEl = resolveResizeTarget(hostEl);
    hostEl.style.position = hostEl.style.position || "relative";

    const size = getElementSize(resizeTargetEl || hostEl);
    const width = Math.max(1, size.width || 120);
    const height = Math.max(1, size.height || 120);

    app = new PIXI.Application({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      autoStart: false
    });

    clearChildren(hostEl);
    hostEl.appendChild(app.view);
    app.view.style.position = "absolute";
    app.view.style.inset = "0";
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    app.view.style.display = "block";
    app.view.style.pointerEvents = "none";

    root = new PIXI.Container();
    pathStage = new PIXI.Container();
    root.addChild(pathStage);
    app.stage.addChild(root);

    targetT = 0.5;
    runnerT = 0.5;
    sweetStart01 = 0.40;
    sweetEnd01 = 0.60;
    intensity01 = 0.5;

    buildLayers();
    drawFrame();
    resize();

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver((entries) => {
        if (!entries?.length || !app) {
          resize();
          return;
        }
        const cr = entries[0].contentRect;
        const width = Math.max(1, Math.floor(cr?.width || 1));
        const height = Math.max(1, Math.floor(cr?.height || 1));
        resizeTo(width, height);
      });
      resizeObserver.observe(resizeTargetEl || hostEl);
    }

    onWindowResize = () => resize();
    window.addEventListener("resize", onWindowResize);

    mounted = true;
    return true;
  }

  function update(data = {}) {
    if (!mounted) return;

    targetT = clamp01(Number.isFinite(data.headPos01) ? data.headPos01 : targetT);
    sweetStart01 = clamp01(Number.isFinite(data.sweetStart01) ? data.sweetStart01 : sweetStart01);
    sweetEnd01 = clamp01(Number.isFinite(data.sweetEnd01) ? data.sweetEnd01 : sweetEnd01);
    intensity01 = clamp01(Number.isFinite(data.intensity01) ? data.intensity01 : intensity01);

    stepRunner(data.dtMs);
    drawFrame();
  }

  function destroy() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (onWindowResize) {
      window.removeEventListener("resize", onWindowResize);
      onWindowResize = null;
    }
    if (app) {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      app = null;
    }

    hostEl = null;
    resizeTargetEl = null;
    root = null;
    pathStage = null;
    layers = null;
    mounted = false;
    targetT = 0.5;
    runnerT = 0.5;
    sweetStart01 = 0.40;
    sweetEnd01 = 0.60;
    intensity01 = 0.5;
  }

  window.initSwingPathPixi = initSwingPathPixi;
  window.SwingPathPixi = {
    init: initSwingPathPixi,
    update,
    resize,
    destroy
  };
})();
