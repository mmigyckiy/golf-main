/**
 * Swing Path Pixi Overlay — Energy Ribbon Arc
 * Premium widening ribbon that builds toward the head with impact pulse
 * Scaled up 1.35x and rotated 180° for stronger strike feel
 * 
 * COORDINATE SYSTEM:
 * - All graphics drawn relative to LOCAL (0, 0)
 * - Container positioned at widget center
 * - Pivot at (0, 0) so transforms happen around center
 */

(function() {
  'use strict';

  // === CONFIG ===
  const CONFIG = {
    // Arc geometry — movement LEFT → RIGHT
    // angleStart = 0.9π (162°), angleEnd = 0.1π (18°)
    arcStartRad: Math.PI * 0.9,   // Start on LEFT side
    arcEndRad: Math.PI * 0.1,     // End on RIGHT side
    DIR_X: 1,                      // Direction handled by container mirror
    
    // Energy ribbon
    TRAIL_POINTS: 56,
    TRAIL_LEN: 0.45,
    TAIL_WIDTH: 3,
    HEAD_WIDTH: 16,
    WIDTH_EXP: 2.4,
    
    // Transform — fixed size to match other widgets (e.g. Attack Angle)
    BASE_RADIUS: 70,     // Base arc radius in design pixels
    TARGET_SIZE: 260,    // Fixed visual diameter in CSS pixels (matches Attack Angle widget)
    
    // Head
    headRadius: 6,
    headGlowRadius: 14,
    
    // Striations
    striationCount: 9,
    striationAlphaMin: 0.08,
    striationAlphaMax: 0.14,
    
    // Sweet spot
    sweetAlpha: 0.28,
    sweetGlowAlpha: 0.12,
    
    // Impact pulse
    pulseDuration: 0.16,
    pulseIntensity: 0.35
  };

  // === COLORS ===
  const COLORS = {
    ribbon: 0xD8C8A6,
    ribbonBright: 0xF0E6D0,
    ribbonDim: 0xB8A886,
    pearl: 0xF5F0E8,
    white: 0xFFFFFF
  };

  // === STATE ===
  let app = null;
  let rootContainer = null;
  let glowGfx = null;
  let ribbonGfx = null;
  let striationGfx = null;
  let sweetGfx = null;
  let headGfx = null;
  let mounted = false;
  let arcRadius = 40;
  let lastState = { headPos01: 0.5, locked: false };
  let spinRafId = null;
  let resizeObserver = null;
  let onWindowResize = null;
  
  // Pulse state
  let pulseActive = false;
  let pulseT = 0;
  let pulseMul = 1;

  /**
   * Convert degrees to radians
   */
  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  /**
   * Clamp value to [0, 1]
   */
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  /**
   * Assert Swing Path visibility/placement
   */
  function assertSwingPathVisible(tag, app, root, hostEl) {
    const w = app?.renderer?.width;
    const h = app?.renderer?.height;
    const view = app?.view;
    const attached = !!(view && view.parentNode);
    const hostRect = hostEl?.getBoundingClientRect?.();
    console.log("[SWING_PATH][ASSERT]", tag, {
      hostExists: !!hostEl,
      hostW: hostRect?.width,
      hostH: hostRect?.height,
      rendererW: w,
      rendererH: h,
      viewAttached: attached,
      viewStyleDisplay: view ? getComputedStyle(view).display : null,
      rootVisible: root?.visible,
      rootAlpha: root?.alpha,
      stageVisible: app?.stage?.visible,
      stageAlpha: app?.stage?.alpha,
      rootPos: root ? { x: root.x, y: root.y } : null,
      rootScale: root ? { x: root.scale?.x, y: root.scale?.y } : null,
      masked: !!root?.mask
    });
  }

  /**
   * Mirror around widget center without moving offscreen
   */
  function mirrorXKeepInBounds(root, viewW, viewH) {
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    
    root.position.set(cx, cy);
    root.pivot.set(cx, cy);
    root.scale.x = -Math.abs(root.scale.x || 1);
    root.visible = true;
    root.alpha = 1;
  }

  /**
   * Resize renderer safely and keep root centered
   */
  function resizeSwingPath(app, root, hostEl) {
    if (!app || !hostEl) return;
    const r = hostEl.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    app.renderer.resize(w, h);
    
    if (root) {
      root.visible = true;
      root.alpha = 1;
      root.position.set(w * 0.5, h * 0.5);
    }
    app.stage.visible = true;
    app.stage.alpha = 1;
  }

  /**
   * Get point on arc for t in [0..1]
   * Movement: LEFT → RIGHT (t=0 on left, t=1 on right)
   * All coordinates are LOCAL (relative to 0,0 which is the arc center)
   */
  function getArcPoint(t01) {
    const angle = CONFIG.arcStartRad + (CONFIG.arcEndRad - CONFIG.arcStartRad) * clamp01(t01);
    return {
      x: Math.cos(angle) * arcRadius * CONFIG.DIR_X,
      y: Math.sin(angle) * arcRadius,
      angle
    };
  }

  /**
   * Get tangent (perpendicular direction) at arc point
   */
  function getArcTangent(t01) {
    const angle = CONFIG.arcStartRad + (CONFIG.arcEndRad - CONFIG.arcStartRad) * clamp01(t01);
    return {
      x: -Math.sin(angle) * CONFIG.DIR_X,
      y: Math.cos(angle)
    };
  }

  /**
   * Width function: widens toward head
   */
  function getWidth(s, headWidthMul = 1) {
    const headW = CONFIG.HEAD_WIDTH * headWidthMul;
    return CONFIG.TAIL_WIDTH + (headW - CONFIG.TAIL_WIDTH) * Math.pow(s, CONFIG.WIDTH_EXP);
  }

  /**
   * Alpha function: builds toward head
   */
  function getAlpha(s) {
    return 0.06 + 0.60 * Math.pow(s, 1.8);
  }

  /**
   * Layout root container — positions widget and applies FIXED scale
   * MUST be called after app creation and on resize
   * 
   * Scale is FIXED based on TARGET_SIZE to match other widgets (e.g. Attack Angle)
   * Resize only updates position, not visual size
   */
  function layoutRoot() {
    if (!rootContainer || !app) return;
    
    // Get CSS pixel dimensions (not device pixels)
    const w = app.view.clientWidth || app.view.width;
    const h = app.view.clientHeight || app.view.height;
    // Position widget CENTERED horizontally
    const cx = w * 0.5;
    
    // Arc radius is fixed in local coords (design space)
    arcRadius = CONFIG.BASE_RADIUS;
    
    // FIXED SCALE: based on TARGET_SIZE, not viewport
    // fitScale converts BASE_RADIUS design coords to TARGET_SIZE CSS pixels
    // The arc spans roughly 2x the radius, so:
    // visualDiameter = BASE_RADIUS * 2 * fitScale = TARGET_SIZE
    const fitScale = CONFIG.TARGET_SIZE / (CONFIG.BASE_RADIUS * 2);
    
    // Vertical center — offset to align visual center of lower arc + ball
    const cy = h * 0.5;
    const visualCenterOffsetY = arcRadius * 0.7 * fitScale;
    
    // Position container
    rootContainer.position.set(cx, cy + visualCenterOffsetY);
    
    // Apply transforms AFTER position
    // Direction is handled by CONFIG.DIR_X at coordinate level
    rootContainer.scale.set(fitScale, fitScale);
    rootContainer.rotation = 0;
    
    // Ensure visibility
    rootContainer.alpha = 1;
    rootContainer.visible = true;
    
    console.log("[SwingPathPixi] Layout", { w, h, cx: cx.toFixed(1), cy: cy.toFixed(1), fitScale: fitScale.toFixed(3), targetSize: CONFIG.TARGET_SIZE });
  }

  /**
   * Initialize the Pixi overlay
   */
  function init(opts = {}) {
    const containerEl = opts.containerEl;
    if (!containerEl || !window.PIXI) {
      console.warn("[SwingPathPixi] Missing container or PIXI");
      return false;
    }

    // Clean up existing to prevent duplicates
    if (app) destroy();

    // Get container dimensions (CSS pixels)
    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 120;
    const h = rect.height || 120;

    // Create Pixi application
    try {
      app = new PIXI.Application({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        autoStart: false
      });

      containerEl.innerHTML = "";
      containerEl.appendChild(app.view);
      app.view.style.position = 'absolute';
      app.view.style.top = '0';
      app.view.style.left = '0';
      app.view.style.width = '100%';
      app.view.style.height = '100%';
      app.view.style.display = 'block';
      app.view.style.pointerEvents = 'none';
      app.view.style.zIndex = '5';

      // Create ONE root container for all graphics
      rootContainer = new PIXI.Container();
      app.stage.addChild(rootContainer);
      app.stage.visible = true;
      app.stage.alpha = 1;
      rootContainer.visible = true;
      rootContainer.alpha = 1;

      // Build graphics layers
      buildLayers();
      
      // Layout root with correct position/transforms
      layoutRoot();
      mirrorXKeepInBounds(rootContainer, app.renderer.width, app.renderer.height);
      assertSwingPathVisible("after-append", app, rootContainer, containerEl);

      requestAnimationFrame(() => {
        resizeSwingPath(app, rootContainer, containerEl);
        layoutRoot();
        mirrorXKeepInBounds(rootContainer, app.renderer.width, app.renderer.height);
        assertSwingPathVisible("after-resize", app, rootContainer, containerEl);
      });

      resizeObserver = new ResizeObserver(() => {
        resizeSwingPath(app, rootContainer, containerEl);
        layoutRoot();
        mirrorXKeepInBounds(rootContainer, app.renderer.width, app.renderer.height);
        assertSwingPathVisible("ro-resize", app, rootContainer, containerEl);
      });
      resizeObserver.observe(containerEl);

      onWindowResize = () => {
        resizeSwingPath(app, rootContainer, containerEl);
        layoutRoot();
        mirrorXKeepInBounds(rootContainer, app.renderer.width, app.renderer.height);
        assertSwingPathVisible("window-resize", app, rootContainer, containerEl);
      };
      window.addEventListener('resize', onWindowResize);

      mounted = true;
      
      // Initial draw
      drawSweet(0.41, 0.59);
      drawRibbon(0.5);
      drawHead(0.5, 0.5);
      
      // Render
      app.render();

      console.log("[SwingPathPixi] Initialized", { 
        w, h, 
        arcRadius,
        mirrorX: CONFIG.MIRROR_X
      });
      return true;
    } catch (err) {
      console.error("[SwingPathPixi] Init failed:", err);
      return false;
    }
  }

  /**
   * Spin the entire widget once (clockwise) over durationMs
   */
  function spinOnce(durationMs = 1000) {
    if (!mounted || !rootContainer || !app) return;
    
    if (spinRafId) {
      cancelAnimationFrame(spinRafId);
      spinRafId = null;
    }
    
    const start = performance.now();
    const startRot = rootContainer.rotation || 0;
    const targetRot = startRot + Math.PI * 2;
    
    const tick = (now) => {
      if (!rootContainer || !app) return;
      const t = Math.min(1, (now - start) / durationMs);
      rootContainer.rotation = startRot + (targetRot - startRot) * t;
      app.render();
      
      if (t < 1) {
        spinRafId = requestAnimationFrame(tick);
      } else {
        spinRafId = null;
        rootContainer.rotation = targetRot;
        app.render();
      }
    };
    
    spinRafId = requestAnimationFrame(tick);
  }

  /**
   * Build graphics layers in correct draw order
   */
  function buildLayers() {
    // 1) Glow layer (lowest, additive)
    glowGfx = new PIXI.Graphics();
    glowGfx.blendMode = PIXI.BLEND_MODES.ADD;
    rootContainer.addChild(glowGfx);

    // 2) Sweet spot layer
    sweetGfx = new PIXI.Graphics();
    rootContainer.addChild(sweetGfx);

    // 3) Main ribbon layer
    ribbonGfx = new PIXI.Graphics();
    rootContainer.addChild(ribbonGfx);

    // 4) Striation layer (energy texture)
    striationGfx = new PIXI.Graphics();
    striationGfx.blendMode = PIXI.BLEND_MODES.ADD;
    rootContainer.addChild(striationGfx);

    // 5) Head layer (top)
    headGfx = new PIXI.Graphics();
    rootContainer.addChild(headGfx);
  }

  /**
   * Draw sweet spot segment on arc
   * All coordinates relative to LOCAL (0,0)
   * Uses line segments via getArcPoint for consistent DIR_X handling
   */
  function drawSweet(sweetStart01, sweetEnd01) {
    if (!sweetGfx) return;
    
    sweetGfx.clear();
    
    // Draw sweet spot as line segments (consistent with DIR_X)
    const segments = 20;
    const step = (sweetEnd01 - sweetStart01) / segments;
    
    // Outer glow
    sweetGfx.lineStyle(12, COLORS.ribbon, CONFIG.sweetGlowAlpha);
    for (let i = 0; i < segments; i++) {
      const t1 = sweetStart01 + step * i;
      const t2 = sweetStart01 + step * (i + 1);
      const p1 = getArcPoint(t1);
      const p2 = getArcPoint(t2);
      sweetGfx.moveTo(p1.x, p1.y);
      sweetGfx.lineTo(p2.x, p2.y);
    }
    
    // Core segment
    sweetGfx.lineStyle(5, COLORS.ribbonBright, CONFIG.sweetAlpha);
    for (let i = 0; i < segments; i++) {
      const t1 = sweetStart01 + step * i;
      const t2 = sweetStart01 + step * (i + 1);
      const p1 = getArcPoint(t1);
      const p2 = getArcPoint(t2);
      sweetGfx.moveTo(p1.x, p1.y);
      sweetGfx.lineTo(p2.x, p2.y);
    }
  }

  /**
   * Draw the energy ribbon arc
   * All coordinates relative to LOCAL (0,0)
   */
  function drawRibbon(headPos01) {
    if (!ribbonGfx || !glowGfx) return;
    
    ribbonGfx.clear();
    glowGfx.clear();
    
    const n = CONFIG.TRAIL_POINTS;
    const points = [];
    
    // Sample points along the ribbon (local coords around 0,0)
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const t = clamp01(headPos01 - (1 - s) * CONFIG.TRAIL_LEN);
      const pt = getArcPoint(t);
      points.push({ x: pt.x, y: pt.y, s, t });
    }
    
    // Draw glow layer (wider, more transparent)
    for (let i = 0; i < n - 1; i++) {
      const sMid = (points[i].s + points[i + 1].s) / 2;
      const width = getWidth(sMid, pulseMul) * 1.8;
      const alpha = getAlpha(sMid) * 0.35;
      
      glowGfx.lineStyle(width, COLORS.ribbon, alpha);
      glowGfx.moveTo(points[i].x, points[i].y);
      glowGfx.lineTo(points[i + 1].x, points[i + 1].y);
    }
    
    // Draw main ribbon
    for (let i = 0; i < n - 1; i++) {
      const sMid = (points[i].s + points[i + 1].s) / 2;
      
      // Apply pulse multiplier to last 25% of ribbon
      const pulseFactor = sMid > 0.75 ? pulseMul : 1;
      const width = getWidth(sMid, pulseFactor);
      const alpha = getAlpha(sMid);
      
      ribbonGfx.lineStyle(width, COLORS.ribbon, alpha);
      ribbonGfx.moveTo(points[i].x, points[i].y);
      ribbonGfx.lineTo(points[i + 1].x, points[i + 1].y);
    }
    
    return points;
  }

  /**
   * Draw subtle striations (energy texture) near the head
   */
  function drawStriations(headPos01) {
    if (!striationGfx) return;
    
    striationGfx.clear();
    
    const count = CONFIG.striationCount;
    
    for (let i = 0; i < count; i++) {
      const s = 0.70 + (i / (count - 1)) * 0.28;
      const t = clamp01(headPos01 - (1 - s) * CONFIG.TRAIL_LEN);
      
      const pt = getArcPoint(t);
      const tangent = getArcTangent(t);
      
      const len = 4 + (i % 3) * 2;
      const alpha = CONFIG.striationAlphaMin + 
        (CONFIG.striationAlphaMax - CONFIG.striationAlphaMin) * (i / (count - 1));
      
      striationGfx.lineStyle(1.5, COLORS.ribbonBright, alpha);
      striationGfx.moveTo(pt.x - tangent.x * len, pt.y - tangent.y * len);
      striationGfx.lineTo(pt.x + tangent.x * len, pt.y + tangent.y * len);
    }
  }

  /**
   * Draw the head ball with glow
   * All coordinates relative to LOCAL (0,0)
   */
  function drawHead(headPos01, intensity01) {
    if (!headGfx) return;
    
    headGfx.clear();
    
    const pt = getArcPoint(headPos01);
    const radius = CONFIG.headRadius * (1 + (pulseMul - 1) * 0.5);
    const glowRadius = CONFIG.headGlowRadius * pulseMul;
    
    // Outer halo
    headGfx.beginFill(COLORS.ribbon, 0.15 + intensity01 * 0.15);
    headGfx.drawCircle(pt.x, pt.y, glowRadius * 1.4);
    headGfx.endFill();
    
    // Inner glow
    headGfx.beginFill(COLORS.ribbonBright, 0.25 + intensity01 * 0.2);
    headGfx.drawCircle(pt.x, pt.y, glowRadius);
    headGfx.endFill();
    
    // Main ball
    headGfx.beginFill(COLORS.pearl, 0.95);
    headGfx.drawCircle(pt.x, pt.y, radius);
    headGfx.endFill();
    
    // Highlight — offset follows DIR_X
    headGfx.beginFill(COLORS.white, 0.55);
    headGfx.drawCircle(pt.x + CONFIG.DIR_X * -2, pt.y - 2, radius * 0.35);
    headGfx.endFill();
  }

  /**
   * Update pulse animation
   */
  function updatePulse(dtSec) {
    if (!pulseActive) {
      pulseMul = 1;
      return;
    }
    
    pulseT += dtSec;
    
    if (pulseT >= CONFIG.pulseDuration) {
      pulseActive = false;
      pulseT = 0;
      pulseMul = 1;
      return;
    }
    
    const k = clamp01(1 - pulseT / CONFIG.pulseDuration);
    pulseMul = 1 + CONFIG.pulseIntensity * Math.sin((1 - k) * Math.PI) * k;
  }

  /**
   * Update the overlay
   */
  function update(data = {}) {
    if (!mounted || !app) return;
    
    const {
      headPos01 = 0.5,
      sweetStart01 = 0.41,
      sweetEnd01 = 0.59,
      locked = false,
      intensity01 = 0.5,
      dtMs = 16
    } = data;
    
    const dtSec = dtMs / 1000;
    
    // Update pulse
    updatePulse(dtSec);
    
    // Draw all layers
    drawSweet(sweetStart01, sweetEnd01);
    drawRibbon(headPos01);
    drawStriations(headPos01);
    drawHead(headPos01, intensity01);
    
    // Store state
    lastState = { headPos01, locked };
    
    // Render
    app.render();
  }

  /**
   * Trigger impact pulse on release
   */
  function onRelease(opts = {}) {
    const { isSweet = false } = opts;
    
    if (isSweet) {
      pulseActive = true;
      pulseT = 0;
    }
    
    lastState.locked = true;
    if (app) app.render();
  }

  /**
   * Lock the overlay (freeze visuals)
   */
  function lock() {
    lastState.locked = true;
    if (app) app.render();
  }

  /**
   * Reset to initial state
   */
  function reset() {
    lastState = { headPos01: 0.5, locked: false };
    pulseActive = false;
    pulseT = 0;
    pulseMul = 1;
    
    // Clear all graphics
    if (glowGfx) glowGfx.clear();
    if (ribbonGfx) ribbonGfx.clear();
    if (striationGfx) striationGfx.clear();
    if (sweetGfx) sweetGfx.clear();
    if (headGfx) headGfx.clear();
    
    // Draw initial state
    drawSweet(0.41, 0.59);
    drawRibbon(0.5);
    drawHead(0.5, 0.5);
    
    if (app) app.render();
  }

  /**
   * Resize to fit container
   */
  function resize() {
    if (!app || !app.view.parentElement) return;
    
    // Rebuild layers
    rootContainer.removeChildren();
    buildLayers();
    
    // Re-layout root with new dimensions
    resizeSwingPath(app, rootContainer, app.view.parentElement);
    layoutRoot();
    mirrorXKeepInBounds(rootContainer, app.renderer.width, app.renderer.height);
    assertSwingPathVisible("resize", app, rootContainer, app.view.parentElement);
    
    // Redraw with last state
    drawSweet(0.41, 0.59);
    drawRibbon(lastState.headPos01);
    drawHead(lastState.headPos01, 0.5);
    
    if (app) app.render();
  }

  /**
   * Destroy and cleanup
   */
  function destroy() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (onWindowResize) {
      window.removeEventListener('resize', onWindowResize);
      onWindowResize = null;
    }
    if (spinRafId) {
      cancelAnimationFrame(spinRafId);
      spinRafId = null;
    }
    if (app) {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      app = null;
    }
    rootContainer = null;
    glowGfx = null;
    ribbonGfx = null;
    striationGfx = null;
    sweetGfx = null;
    headGfx = null;
    mounted = false;
    lastState = { headPos01: 0.5, locked: false };
    pulseActive = false;
    pulseT = 0;
    pulseMul = 1;
  }

  // Export to window
  window.SwingPathPixi = {
    init,
    update,
    onRelease,
    lock,
    reset,
    resize,
    destroy,
    spinOnce
  };

})();
