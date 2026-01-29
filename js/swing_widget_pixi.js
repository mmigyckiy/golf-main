/**
 * Unified Swing Widget — PixiJS Variant 2 (Hold-Time Physics)
 * 
 * Single widget combining:
 * - Swing Path: runner moving along broken top arc
 * - Swing Tempo: derived from runner speed (glow intensity)
 * - Attack Angle: tilting club glyph near impact
 * 
 * Animates during HOLD, locks on RELEASE
 */

(function() {
  'use strict';
  
  // Colors
  const COLORS = {
    graphite: 0x4A4F55,
    graphiteDark: 0x2A2D32,
    gold: 0xD8C8A6,
    goldSoft: 0xCDBB8A,
    runner: 0xE7EBF0,
    white: 0xFFFFFF,
    impactBall: 0xF5F0E8
  };
  
  // Config
  const CONFIG = {
    arcStartDeg: 210,
    arcEndDeg: -30,
    arcStrokeWidth: 8,
    sweetWidth: 0.18,
    runnerRadius: 6,
    impactBallRadius: 5,
    clubLength: 32,
    clubHeadWidth: 10,
    clubHeadHeight: 5
  };
  
  // Module state
  let app = null;
  let container = null;
  let graphics = {};
  let dims = { w: 0, h: 0, cx: 0, cy: 0, radius: 0 };
  let mounted = false;
  let lastData = null;
  
  /**
   * Convert degrees to radians
   */
  function degToRad(deg) {
    return deg * Math.PI / 180;
  }
  
  /**
   * Get point on arc
   */
  function getArcPoint(t01, cx, cy, radius, startRad, endRad) {
    const angle = startRad + (endRad - startRad) * t01;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      angle: angle
    };
  }
  
  /**
   * Initialize the Swing Widget
   */
  function init(el, opts = {}) {
    if (!el || !window.PIXI) {
      console.warn("[SwingWidget] Missing element or PIXI");
      return;
    }
    
    if (app) {
      destroy();
    }
    
    const rect = el.getBoundingClientRect();
    dims.w = rect.width || 400;
    dims.h = rect.height || 260;
    
    // Create Pixi app with manual rendering
    app = new PIXI.Application({
      width: dims.w,
      height: dims.h,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: false
    });
    
    el.appendChild(app.view);
    
    container = new PIXI.Container();
    app.stage.addChild(container);
    
    // Calculate dimensions
    updateDimensions();
    
    // Build graphics
    buildGraphics();
    
    mounted = true;
    
    // Initial render
    app.render();
    
    console.log("[SwingWidget] Initialized", { w: dims.w, h: dims.h });
  }
  
  /**
   * Update dimensions based on container
   */
  function updateDimensions() {
    dims.cx = dims.w / 2;
    dims.cy = dims.h / 2 + 20;
    dims.radius = Math.min(dims.w, dims.h) * 0.32;
    dims.startRad = degToRad(CONFIG.arcStartDeg);
    dims.endRad = degToRad(CONFIG.arcEndDeg);
  }
  
  /**
   * Build all graphics elements
   */
  function buildGraphics() {
    // Background vignette
    const vignette = new PIXI.Graphics();
    vignette.beginFill(0x000000, 0.15);
    vignette.drawCircle(dims.cx, dims.cy - 20, dims.radius * 1.8);
    vignette.endFill();
    container.addChild(vignette);
    graphics.vignette = vignette;
    
    // Arc track (broken at bottom)
    const arcTrack = new PIXI.Graphics();
    arcTrack.lineStyle(CONFIG.arcStrokeWidth, COLORS.graphite, 0.45);
    arcTrack.arc(dims.cx, dims.cy, dims.radius, dims.startRad, dims.endRad, true);
    container.addChild(arcTrack);
    graphics.arcTrack = arcTrack;
    
    // Arc outer border
    const arcBorder = new PIXI.Graphics();
    arcBorder.lineStyle(1, COLORS.white, 0.06);
    arcBorder.arc(dims.cx, dims.cy, dims.radius + CONFIG.arcStrokeWidth / 2 + 1, dims.startRad, dims.endRad, true);
    container.addChild(arcBorder);
    
    // Sweet segment (will be updated dynamically)
    const sweetArc = new PIXI.Graphics();
    container.addChild(sweetArc);
    graphics.sweetArc = sweetArc;
    
    // Draw initial sweet segment
    drawSweetSegment(0.5, CONFIG.sweetWidth);
    
    // Impact ball (bottom center)
    const impactBall = new PIXI.Graphics();
    impactBall.beginFill(COLORS.impactBall, 0.7);
    impactBall.drawCircle(dims.cx, dims.cy + dims.radius + 24, CONFIG.impactBallRadius);
    impactBall.endFill();
    // Highlight
    impactBall.beginFill(COLORS.white, 0.4);
    impactBall.drawCircle(dims.cx - 1.5, dims.cy + dims.radius + 22.5, CONFIG.impactBallRadius * 0.35);
    impactBall.endFill();
    container.addChild(impactBall);
    graphics.impactBall = impactBall;
    
    // Attack angle glyph container
    const attackContainer = new PIXI.Container();
    attackContainer.x = dims.cx;
    attackContainer.y = dims.cy + dims.radius + 24;
    container.addChild(attackContainer);
    graphics.attackContainer = attackContainer;
    
    // Club shaft
    const clubShaft = new PIXI.Graphics();
    clubShaft.lineStyle(2.5, COLORS.goldSoft, 0.6);
    clubShaft.moveTo(0, 0);
    clubShaft.lineTo(0, -CONFIG.clubLength);
    attackContainer.addChild(clubShaft);
    graphics.clubShaft = clubShaft;
    
    // Club head
    const clubHead = new PIXI.Graphics();
    clubHead.beginFill(COLORS.gold, 0.7);
    clubHead.drawRoundedRect(
      -CONFIG.clubHeadWidth / 2,
      -CONFIG.clubLength - CONFIG.clubHeadHeight / 2,
      CONFIG.clubHeadWidth,
      CONFIG.clubHeadHeight,
      2
    );
    clubHead.endFill();
    // Highlight
    clubHead.beginFill(COLORS.white, 0.25);
    clubHead.drawRoundedRect(
      -CONFIG.clubHeadWidth / 2 + 1,
      -CONFIG.clubLength - CONFIG.clubHeadHeight / 2 + 1,
      CONFIG.clubHeadWidth - 2,
      2,
      1
    );
    clubHead.endFill();
    attackContainer.addChild(clubHead);
    graphics.clubHead = clubHead;
    
    // Runner glow (behind runner)
    const runnerGlow = new PIXI.Graphics();
    container.addChild(runnerGlow);
    graphics.runnerGlow = runnerGlow;
    
    // Runner marker
    const runner = new PIXI.Graphics();
    runner.beginFill(COLORS.runner, 0.95);
    runner.drawCircle(0, 0, CONFIG.runnerRadius);
    runner.endFill();
    // Highlight
    runner.beginFill(COLORS.white, 0.5);
    runner.drawCircle(-1.5, -1.5, CONFIG.runnerRadius * 0.35);
    runner.endFill();
    container.addChild(runner);
    graphics.runner = runner;
    
    // Position runner at center
    updateRunner(0.5, 0);
  }
  
  /**
   * Draw sweet segment on arc
   */
  function drawSweetSegment(center01, width01) {
    const sweet = graphics.sweetArc;
    if (!sweet) return;
    
    sweet.clear();
    
    const startT = Math.max(0, center01 - width01 / 2);
    const endT = Math.min(1, center01 + width01 / 2);
    
    const startAngle = dims.startRad + (dims.endRad - dims.startRad) * startT;
    const endAngle = dims.startRad + (dims.endRad - dims.startRad) * endT;
    
    // Main sweet segment
    sweet.lineStyle(CONFIG.arcStrokeWidth + 2, COLORS.gold, 0.35);
    sweet.arc(dims.cx, dims.cy, dims.radius, startAngle, endAngle, true);
    
    // Inner glow
    sweet.lineStyle(CONFIG.arcStrokeWidth - 2, COLORS.gold, 0.2);
    sweet.arc(dims.cx, dims.cy, dims.radius, startAngle, endAngle, true);
  }
  
  /**
   * Update runner position
   */
  function updateRunner(path01, tempo01) {
    const pos = getArcPoint(path01, dims.cx, dims.cy, dims.radius, dims.startRad, dims.endRad);
    
    if (graphics.runner) {
      graphics.runner.x = pos.x;
      graphics.runner.y = pos.y;
    }
    
    // Update glow based on tempo
    if (graphics.runnerGlow) {
      const glow = graphics.runnerGlow;
      glow.clear();
      
      const glowAlpha = 0.15 + tempo01 * 0.35;
      const glowRadius = CONFIG.runnerRadius + 4 + tempo01 * 8;
      
      glow.beginFill(COLORS.gold, glowAlpha);
      glow.drawCircle(pos.x, pos.y, glowRadius);
      glow.endFill();
    }
  }
  
  /**
   * Update attack angle glyph
   */
  function updateAttack(deg) {
    if (graphics.attackContainer) {
      // Visual multiplier for clarity
      const visualMult = 3;
      graphics.attackContainer.rotation = (deg || 0) * visualMult * (Math.PI / 180);
    }
  }
  
  /**
   * Update the widget with current state
   */
  function update(data) {
    if (!mounted || !app) return;
    
    lastData = data;
    const { tempo01 = 0, path01 = 0.5, attackDeg = 0, sweet } = data;
    
    // Update sweet segment if provided
    if (sweet && sweet.pathCenter01 !== undefined) {
      drawSweetSegment(sweet.pathCenter01, sweet.pathWidth01 || CONFIG.sweetWidth);
    }
    
    // Update runner position and glow
    updateRunner(path01, tempo01);
    
    // Update attack angle
    updateAttack(attackDeg);
    
    // Render
    app.render();
  }
  
  /**
   * Lock the widget (freeze visuals)
   */
  function lock() {
    // Visual feedback could be added here (e.g., pulse)
    if (lastData) {
      console.log("[SwingWidget] lock", {
        tempo01: lastData.tempo01?.toFixed(3),
        path01: lastData.path01?.toFixed(3),
        attackDeg: lastData.attackDeg?.toFixed(2)
      });
    }
    // Render final state
    if (app) app.render();
  }
  
  /**
   * Reset the widget to initial state
   */
  function reset() {
    lastData = null;
    
    // Reset to center position
    updateRunner(0.5, 0);
    updateAttack(0);
    drawSweetSegment(0.5, CONFIG.sweetWidth);
    
    if (app) app.render();
  }
  
  /**
   * Resize handler
   */
  function resize() {
    if (!app || !app.view.parentElement) return;
    
    const rect = app.view.parentElement.getBoundingClientRect();
    dims.w = rect.width || dims.w;
    dims.h = rect.height || dims.h;
    
    app.renderer.resize(dims.w, dims.h);
    updateDimensions();
    
    // Rebuild graphics
    container.removeChildren();
    buildGraphics();
    
    // Restore last state
    if (lastData) {
      update(lastData);
    } else {
      app.render();
    }
  }
  
  /**
   * Destroy and cleanup
   */
  function destroy() {
    if (app) {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      app = null;
    }
    container = null;
    graphics = {};
    mounted = false;
    lastData = null;
  }
  
  // Export to window
  window.SwingWidget = {
    init,
    update,
    lock,
    reset,
    resize,
    destroy
  };
  
})();
