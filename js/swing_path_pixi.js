/**
 * Swing Path Pixi — Premium Arc Renderer
 * Keeps architecture intact: mounts to #pathPixi and exposes SwingPathPixi API.
 */
(function() {
  "use strict";

  const DEBUG_PATH_BOUNDS = false;
  // Single source of truth for Path arc + runner material so it stays visually aligned with Attack.
  const PATH_ARC_STYLE = Object.freeze({
    geometry: Object.freeze({
      designW: 120,
      designH: 90,
      cx: 60,
      cy: 70,
      radius: 56,
      startRad: Math.PI,
      endRad: 0
    }),
    cap: "round",
    outer: Object.freeze({ width: 10, color: 0x1a2e1a, alpha: 0.55 }),
    inner: Object.freeze({ width: 6, color: 0x4ade80, alpha: 0.40 }),
    glow: Object.freeze({
      enabled: true,
      blur: 8,
      strength: 1.2,
      color: 0x4ade80,
      alpha: 0.38
    }),
    sweet: Object.freeze({
      width: 7,
      alpha: 0.92,
      glowWidth: 12,
      glowAlpha: 0.45
    }),
    energy: Object.freeze({
      width: 4,
      alphaMin: 0.34,
      alphaMax: 0.62,
      trailBase: 0.11,
      trailBoost: 0.09
    }),
    guide: Object.freeze({
      width: 2,
      color: 0xD9D2BF,
      alpha: 0.08
    }),
    ball: Object.freeze({
      size: 20,
      dimpleStep: 7,
      shadow: "rgba(0,0,0,0.35)",
      rim: "rgba(255,255,255,0.18)",
      highlight: "rgba(245,238,220,0.98)",
      edge: "rgba(210,200,170,0.95)"
    }),
    followLerp: 0.14
  });

  let app = null;
  let hostEl = null;
  let resizeTargetEl = null;
  let root = null;
  let pathStage = null;
  let layers = null;
  let resizeObserver = null;
  let onWindowResize = null;
  let mounted = false;
  let runnerTexture = null;

  let targetT = 0.5;
  let runnerT = 0.5;
  let sweetStart01 = 0.40;
  let sweetEnd01 = 0.60;
  let intensity01 = 0.5;

  function clamp01(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, Number(v) || 0));
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

  function createGolfBallTexture(sizePx = PATH_ARC_STYLE.ball.size) {
    // Match Attack runner material: warm core, soft shadow, and dimple pattern at the same visual scale.
    const texSize = Math.max(32, Math.round(sizePx * 2));
    const canvas = document.createElement("canvas");
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext("2d");
    if (!ctx || !window.PIXI?.Texture) return null;

    const c = texSize * 0.5;
    const r = texSize * 0.42;

    ctx.clearRect(0, 0, texSize, texSize);

    const base = ctx.createRadialGradient(c - r * 0.10, c - r * 0.12, r * 0.10, c, c, r * 1.02);
    base.addColorStop(0, PATH_ARC_STYLE.ball.highlight);
    base.addColorStop(0.62, PATH_ARC_STYLE.ball.highlight);
    base.addColorStop(1, PATH_ARC_STYLE.ball.edge);
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();

    const shade = ctx.createRadialGradient(c, c + r * 0.25, r * 0.10, c, c, r * 1.06);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, PATH_ARC_STYLE.ball.shadow);
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();

    const warmLift = ctx.createRadialGradient(c + r * 0.18, c + r * 0.26, r * 0.06, c + r * 0.18, c + r * 0.26, r * 0.60);
    warmLift.addColorStop(0, "rgba(255,255,255,0.22)");
    warmLift.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = warmLift;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(c - r * 0.30, c - r * 0.32, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Repeating dimple pattern clipped inside the ball.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r * 0.92, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    const dimpleStep = Math.max(5, PATH_ARC_STYLE.ball.dimpleStep);
    const dimpleRadius = Math.max(1.4, dimpleStep * 0.24);
    for (let row = -4; row <= 4; row += 1) {
      const y = c + row * dimpleStep;
      const rowOffset = (row & 1) ? dimpleStep * 0.5 : 0;
      for (let col = -4; col <= 4; col += 1) {
        const x = c + col * dimpleStep + rowOffset;
        const dx = x - c;
        const dy = y - c;
        if ((dx * dx) + (dy * dy) > (r * 0.78) * (r * 0.78)) continue;
        ctx.beginPath();
        ctx.arc(x, y, dimpleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.strokeStyle = PATH_ARC_STYLE.ball.rim;
    ctx.lineWidth = Math.max(1, texSize * 0.03);
    ctx.beginPath();
    ctx.arc(c, c, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const texture = window.PIXI.Texture.from(canvas);
    const bt = texture?.baseTexture;
    if (bt && window.PIXI.SCALE_MODES) {
      bt.scaleMode = window.PIXI.SCALE_MODES.LINEAR;
    }
    return texture;
  }

  function ensureRunnerTexture() {
    if (runnerTexture) return runnerTexture;
    runnerTexture = createGolfBallTexture(PATH_ARC_STYLE.ball.size);
    return runnerTexture;
  }

  function computeLayout() {
    const g = PATH_ARC_STYLE.geometry;
    const w = Math.max(1, app?.screen?.width || app?.renderer?.width || 1);
    const h = Math.max(1, app?.screen?.height || app?.renderer?.height || 1);
    const sx = w / g.designW;
    const sy = h / g.designH;
    const scale = Math.max(0.0001, Math.min(sx, sy));
    const cx = g.cx * sx;
    const cy = g.cy * sy;
    const r = g.radius * scale;
    return { w, h, cx, cy, r, sx, sy, scale };
  }

  function pointOnArc(layout, t01) {
    const g = PATH_ARC_STYLE.geometry;
    const t = clamp01(t01);
    const angle = g.startRad + (g.endRad - g.startRad) * t;
    return {
      x: layout.cx + Math.cos(angle) * layout.r,
      y: layout.cy - Math.sin(angle) * layout.r,
      angle
    };
  }

  function setArcLineStyle(gfx, width, color, alpha) {
    if (!gfx) return;
    const wantsRound = String(PATH_ARC_STYLE.cap || "").toLowerCase() === "round";
    const lineCap = wantsRound ? (window.PIXI?.LINE_CAP?.ROUND || "round") : PATH_ARC_STYLE.cap;
    const lineJoin = wantsRound ? (window.PIXI?.LINE_JOIN?.ROUND || "round") : PATH_ARC_STYLE.cap;
    try {
      gfx.lineStyle({
        width,
        color,
        alpha,
        alignment: 0.5,
        native: true,
        cap: lineCap,
        join: lineJoin
      });
      return;
    } catch (_err) {
      // Pixi signature fallback.
    }
    gfx.lineStyle(width, color, alpha, 0.5, true);
  }

  function drawArcSegment(gfx, layout, from01, to01) {
    const g = PATH_ARC_STYLE.geometry;
    const a = clamp01(from01);
    const b = clamp01(to01);
    const a0 = g.startRad + (g.endRad - g.startRad) * a;
    const a1 = g.startRad + (g.endRad - g.startRad) * b;
    const start = pointOnArc(layout, a);
    gfx.moveTo(start.x, start.y);
    gfx.arc(layout.cx, layout.cy, layout.r, a0, a1, false);
  }

  function buildLayers() {
    if (!pathStage) return;
    pathStage.removeChildren();

    layers = {
      guides: new PIXI.Graphics(),
      arcGlow: new PIXI.Graphics(),
      baseOuter: new PIXI.Graphics(),
      baseInner: new PIXI.Graphics(),
      sweetGlow: new PIXI.Graphics(),
      sweetArc: new PIXI.Graphics(),
      energyArc: new PIXI.Graphics(),
      runnerGlow: new PIXI.Graphics(),
      runner: new PIXI.Sprite(),
      debug: new PIXI.Graphics()
    };

    const BlurFilter = getBlurFilterClass();
    if (BlurFilter && PATH_ARC_STYLE.glow.enabled) {
      const blur = Math.max(1, PATH_ARC_STYLE.glow.blur * PATH_ARC_STYLE.glow.strength);
      layers.arcGlow.filters = [new BlurFilter(blur)];
      layers.sweetGlow.filters = [new BlurFilter(Math.max(2, blur - 2))];
      layers.runnerGlow.filters = [new BlurFilter(Math.max(1, blur * 0.5))];
    }

    pathStage.addChild(layers.guides);
    pathStage.addChild(layers.arcGlow);
    pathStage.addChild(layers.baseOuter);
    pathStage.addChild(layers.baseInner);
    pathStage.addChild(layers.sweetGlow);
    pathStage.addChild(layers.sweetArc);
    pathStage.addChild(layers.energyArc);
    pathStage.addChild(layers.runnerGlow);
    pathStage.addChild(layers.runner);
    if (DEBUG_PATH_BOUNDS) pathStage.addChild(layers.debug);

    layers.runnerGlow.clear();
    layers.runnerGlow.beginFill(PATH_ARC_STYLE.glow.color, 1);
    layers.runnerGlow.drawCircle(0, 0, Math.max(8, PATH_ARC_STYLE.ball.size * 0.60));
    layers.runnerGlow.endFill();
    layers.runnerGlow.alpha = PATH_ARC_STYLE.glow.alpha * 0.58;

    layers.runner.texture = ensureRunnerTexture() || PIXI.Texture.WHITE;
    layers.runner.anchor.set(0.5);
    layers.runner.width = PATH_ARC_STYLE.ball.size;
    layers.runner.height = PATH_ARC_STYLE.ball.size;
    layers.runner.roundPixels = true;
  }

  function drawFrame() {
    if (!app || !layers) return;

    const layout = computeLayout();
    const s0 = Math.min(sweetStart01, sweetEnd01);
    const s1 = Math.max(sweetStart01, sweetEnd01);
    const inSweet = runnerT >= s0 && runnerT <= s1;

    layers.guides.clear();
    if (PATH_ARC_STYLE.guide.alpha > 0) {
      const topY = layout.cy - layout.r - (layout.scale * 1.5);
      const bottomY = layout.cy + (layout.scale * 6);
      setArcLineStyle(
        layers.guides,
        PATH_ARC_STYLE.guide.width,
        PATH_ARC_STYLE.guide.color,
        PATH_ARC_STYLE.guide.alpha
      );
      layers.guides.moveTo(layout.cx, topY);
      layers.guides.lineTo(layout.cx, bottomY);
    }

    layers.arcGlow.clear();
    if (PATH_ARC_STYLE.glow.enabled) {
      setArcLineStyle(
        layers.arcGlow,
        PATH_ARC_STYLE.inner.width + 4,
        PATH_ARC_STYLE.glow.color,
        PATH_ARC_STYLE.glow.alpha
      );
      drawArcSegment(layers.arcGlow, layout, 0, 1);
    }

    // Two-layer warm arc to match Attack family without changing path behavior.
    layers.baseOuter.clear();
    setArcLineStyle(
      layers.baseOuter,
      PATH_ARC_STYLE.outer.width,
      PATH_ARC_STYLE.outer.color,
      PATH_ARC_STYLE.outer.alpha
    );
    drawArcSegment(layers.baseOuter, layout, 0, 1);

    layers.baseInner.clear();
    setArcLineStyle(
      layers.baseInner,
      PATH_ARC_STYLE.inner.width,
      PATH_ARC_STYLE.inner.color,
      PATH_ARC_STYLE.inner.alpha
    );
    drawArcSegment(layers.baseInner, layout, 0, 1);

    // Sweet window accent: subtle, without blurring the whole canvas.
    layers.sweetGlow.clear();
    setArcLineStyle(
      layers.sweetGlow,
      PATH_ARC_STYLE.sweet.glowWidth,
      PATH_ARC_STYLE.glow.color,
      PATH_ARC_STYLE.sweet.glowAlpha
    );
    drawArcSegment(layers.sweetGlow, layout, s0, s1);

    layers.sweetArc.clear();
    setArcLineStyle(
      layers.sweetArc,
      PATH_ARC_STYLE.sweet.width,
      PATH_ARC_STYLE.inner.color,
      PATH_ARC_STYLE.sweet.alpha
    );
    drawArcSegment(layers.sweetArc, layout, s0, s1);

    // Energy ribbon near runner, trailing along movement direction.
    const trail = PATH_ARC_STYLE.energy.trailBase + intensity01 * PATH_ARC_STYLE.energy.trailBoost;
    const e0 = clamp01(runnerT - trail);
    const e1 = clamp01(runnerT);
    layers.energyArc.clear();
    setArcLineStyle(
      layers.energyArc,
      PATH_ARC_STYLE.energy.width,
      PATH_ARC_STYLE.inner.color,
      lerp(PATH_ARC_STYLE.energy.alphaMin, PATH_ARC_STYLE.energy.alphaMax, intensity01)
    );
    drawArcSegment(layers.energyArc, layout, e0, e1);

    // Runner ball + subtle under-glow.
    const p = pointOnArc(layout, runnerT);
    const px = snapHalf(p.x);
    const py = snapHalf(p.y);
    layers.runnerGlow.position.set(px, py);
    layers.runnerGlow.scale.set(inSweet ? 1.12 : 0.98);
    layers.runnerGlow.alpha = inSweet ? PATH_ARC_STYLE.glow.alpha : (PATH_ARC_STYLE.glow.alpha * 0.58);

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
    const alpha = 1 - Math.pow(1 - PATH_ARC_STYLE.followLerp, dt / 16.67);
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

    const valueDeg = Number.isFinite(data.valueDeg)
      ? clamp(data.valueDeg, -6, 6)
      : Number.isFinite(data.headPos01)
        ? clamp((clamp01(data.headPos01) * 12) - 6, -6, 6)
        : clamp((targetT * 12) - 6, -6, 6);
    targetT = clamp01((valueDeg + 6) / 12);
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
    if (runnerTexture) {
      runnerTexture.destroy?.(true);
      runnerTexture = null;
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
