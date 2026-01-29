/**
 * Pixi Swing Path Widget — Premium arc with runner and trail
 * Broken top arc, sweet segment, runner ball with motion trail
 */

(function() {
  'use strict';

  // Colors
  const COLORS = {
    arcBase: 0x3A3D42,
    arcHighlight: 0x5A5D62,
    gold: 0xD8C8A6,
    goldSoft: 0xCDBB8A,
    pearl: 0xF5F0E8,
    white: 0xFFFFFF,
    ball: 0xE8E4DC,
    trailColor: 0xD8C8A6
  };

  // Config
  const CONFIG = {
    arcStartDeg: 210,
    arcEndDeg: -30,
    arcStrokeWidth: 6,
    sweetWidth01: 0.18,
    runnerRadius: 5,
    ballRadius: 4,
    trailLength: 8,
    trailFade: 0.12
  };

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
      angle
    };
  }

  /**
   * Create a Swing Path widget instance
   */
  function init(canvasEl, opts = {}) {
    if (!canvasEl || !window.PIXI) {
      console.warn("[PixiSwingPath] Missing canvas or PIXI");
      return null;
    }

    const rect = canvasEl.getBoundingClientRect();
    const w = rect.width || 120;
    const h = rect.height || 120;

    // Create Pixi app with manual rendering
    const app = new PIXI.Application({
      view: canvasEl,
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: false
    });

    const container = new PIXI.Container();
    app.stage.addChild(container);

    // State
    const state = {
      value01: 0.5,
      targetValue01: 0.5,
      sweetCenter01: 0.5,
      sweetWidth01: CONFIG.sweetWidth01,
      isHolding: false,
      isLocked: false,
      trail: [] // Store last N positions
    };

    // Calculate dimensions
    const dims = {
      w, h,
      cx: w / 2,
      cy: h / 2 + 8,
      radius: Math.min(w, h) * 0.38,
      startRad: degToRad(CONFIG.arcStartDeg),
      endRad: degToRad(CONFIG.arcEndDeg)
    };

    // Graphics elements
    const gfx = {
      vignette: new PIXI.Graphics(),
      arcBase: new PIXI.Graphics(),
      arcHighlight: new PIXI.Graphics(),
      sweet: new PIXI.Graphics(),
      trail: new PIXI.Graphics(),
      runner: new PIXI.Graphics(),
      runnerGlow: new PIXI.Graphics(),
      ball: new PIXI.Graphics()
    };

    // Add to container in order
    container.addChild(gfx.vignette);
    container.addChild(gfx.arcBase);
    container.addChild(gfx.arcHighlight);
    container.addChild(gfx.sweet);
    container.addChild(gfx.trail);
    container.addChild(gfx.runnerGlow);
    container.addChild(gfx.runner);
    container.addChild(gfx.ball);

    // Draw static elements
    function drawStatic() {
      // Vignette/stage light
      gfx.vignette.clear();
      gfx.vignette.beginFill(0x000000, 0.12);
      gfx.vignette.drawCircle(dims.cx, dims.cy - 10, dims.radius * 1.5);
      gfx.vignette.endFill();

      // Base arc (dark, broken at bottom)
      gfx.arcBase.clear();
      gfx.arcBase.lineStyle(CONFIG.arcStrokeWidth, COLORS.arcBase, 0.7);
      gfx.arcBase.arc(dims.cx, dims.cy, dims.radius, dims.startRad, dims.endRad, true);

      // Highlight arc (thin specular)
      gfx.arcHighlight.clear();
      gfx.arcHighlight.lineStyle(1, COLORS.arcHighlight, 0.3);
      gfx.arcHighlight.arc(dims.cx, dims.cy, dims.radius - CONFIG.arcStrokeWidth / 2 - 1, dims.startRad, dims.endRad, true);

      // Impact ball at bottom center
      gfx.ball.clear();
      gfx.ball.beginFill(COLORS.ball, 0.8);
      gfx.ball.drawCircle(dims.cx, dims.cy + dims.radius + 12, CONFIG.ballRadius);
      gfx.ball.endFill();
      // Highlight
      gfx.ball.beginFill(COLORS.white, 0.4);
      gfx.ball.drawCircle(dims.cx - 1, dims.cy + dims.radius + 11, CONFIG.ballRadius * 0.3);
      gfx.ball.endFill();
    }

    // Draw sweet segment
    function drawSweet() {
      gfx.sweet.clear();
      
      const startT = Math.max(0, state.sweetCenter01 - state.sweetWidth01 / 2);
      const endT = Math.min(1, state.sweetCenter01 + state.sweetWidth01 / 2);
      
      const startAngle = dims.startRad + (dims.endRad - dims.startRad) * startT;
      const endAngle = dims.startRad + (dims.endRad - dims.startRad) * endT;
      
      // Sweet segment with glow
      gfx.sweet.lineStyle(CONFIG.arcStrokeWidth + 2, COLORS.gold, 0.35);
      gfx.sweet.arc(dims.cx, dims.cy, dims.radius, startAngle, endAngle, true);
      
      // Inner brighter line
      gfx.sweet.lineStyle(CONFIG.arcStrokeWidth - 2, COLORS.goldSoft, 0.25);
      gfx.sweet.arc(dims.cx, dims.cy, dims.radius, startAngle, endAngle, true);
    }

    // Draw trail
    function drawTrail() {
      gfx.trail.clear();
      
      if (state.trail.length < 2) return;
      
      for (let i = 0; i < state.trail.length - 1; i++) {
        const alpha = (i / state.trail.length) * CONFIG.trailFade;
        const pos = state.trail[i];
        gfx.trail.beginFill(COLORS.trailColor, alpha);
        gfx.trail.drawCircle(pos.x, pos.y, CONFIG.runnerRadius * 0.5 * (i / state.trail.length));
        gfx.trail.endFill();
      }
    }

    // Draw runner
    function drawRunner() {
      const pos = getArcPoint(state.value01, dims.cx, dims.cy, dims.radius, dims.startRad, dims.endRad);

      // Update trail
      if (state.isHolding && !state.isLocked) {
        state.trail.push({ x: pos.x, y: pos.y });
        if (state.trail.length > CONFIG.trailLength) {
          state.trail.shift();
        }
      }

      drawTrail();

      // Runner glow
      gfx.runnerGlow.clear();
      if (state.isHolding) {
        gfx.runnerGlow.beginFill(COLORS.gold, 0.2);
        gfx.runnerGlow.drawCircle(pos.x, pos.y, CONFIG.runnerRadius + 4);
        gfx.runnerGlow.endFill();
      }

      // Runner ball
      gfx.runner.clear();
      gfx.runner.beginFill(COLORS.pearl, 0.95);
      gfx.runner.drawCircle(pos.x, pos.y, CONFIG.runnerRadius);
      gfx.runner.endFill();
      // Highlight
      gfx.runner.beginFill(COLORS.white, 0.5);
      gfx.runner.drawCircle(pos.x - 1.5, pos.y - 1.5, CONFIG.runnerRadius * 0.35);
      gfx.runner.endFill();
    }

    // Initial draw
    drawStatic();
    drawSweet();
    drawRunner();
    app.render();

    // Instance methods
    const instance = {
      update(data) {
        if (state.isLocked) return;
        
        state.targetValue01 = data.value01 ?? 0.5;
        state.sweetCenter01 = data.sweetCenter01 ?? 0.5;
        state.sweetWidth01 = data.sweetWidth01 ?? CONFIG.sweetWidth01;
        state.isHolding = data.isHolding ?? false;
        
        // Smooth interpolation
        state.value01 += (state.targetValue01 - state.value01) * 0.2;
        
        drawSweet();
        drawRunner();
        app.render();
      },

      lock() {
        state.isLocked = true;
        state.isHolding = false;
        state.trail = []; // Clear trail on lock
        drawRunner();
        app.render();
      },

      reset() {
        state.value01 = 0.5;
        state.targetValue01 = 0.5;
        state.isHolding = false;
        state.isLocked = false;
        state.trail = [];
        drawRunner();
        app.render();
      },

      destroy() {
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      },

      render() {
        app.render();
      }
    };

    return instance;
  }

  // Export
  window.PixiSwingPath = { init };
})();
