/**
 * Pixi Tempo Widget — Premium vertical energy meter
 * Soft rounded tube with fill and head ball
 */

(function() {
  'use strict';

  // Colors
  const COLORS = {
    tube: 0x2A2D32,
    tubeBorder: 0x3A3D42,
    fill: 0x4A6B4A,
    fillGlow: 0x5A8B5A,
    gold: 0xD8C8A6,
    goldSoft: 0xCDBB8A,
    pearl: 0xF5F0E8,
    white: 0xFFFFFF,
    sweetGlow: 0xD8C8A6
  };

  // Config
  const CONFIG = {
    tubeWidth: 28,
    tubeRadius: 14,
    headRadius: 8,
    innerPadding: 4,
    sweetAlpha: 0.35
  };

  /**
   * Create a Tempo widget instance
   */
  function init(canvasEl, opts = {}) {
    if (!canvasEl || !window.PIXI) {
      console.warn("[PixiTempo] Missing canvas or PIXI");
      return null;
    }

    const rect = canvasEl.getBoundingClientRect();
    const w = rect.width || 100;
    const h = rect.height || 130;

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
      value01: 0,
      targetValue01: 0,
      sweetStart01: 0.6,
      sweetEnd01: 0.8,
      isHolding: false,
      isLocked: false
    };

    // Graphics elements
    const gfx = {
      vignette: new PIXI.Graphics(),
      tube: new PIXI.Graphics(),
      fill: new PIXI.Graphics(),
      sweet: new PIXI.Graphics(),
      head: new PIXI.Graphics(),
      headGlow: new PIXI.Graphics()
    };

    // Add to container in order
    container.addChild(gfx.vignette);
    container.addChild(gfx.tube);
    container.addChild(gfx.fill);
    container.addChild(gfx.sweet);
    container.addChild(gfx.headGlow);
    container.addChild(gfx.head);

    // Calculate dimensions
    const dims = {
      w, h,
      cx: w / 2,
      tubeLeft: (w - CONFIG.tubeWidth) / 2,
      tubeTop: 12,
      tubeHeight: h - 32,
      innerLeft: (w - CONFIG.tubeWidth) / 2 + CONFIG.innerPadding,
      innerWidth: CONFIG.tubeWidth - CONFIG.innerPadding * 2
    };

    // Draw static elements
    function drawStatic() {
      // Vignette background
      gfx.vignette.clear();
      gfx.vignette.beginFill(0x000000, 0.15);
      gfx.vignette.drawEllipse(dims.cx, dims.h / 2, dims.w * 0.6, dims.h * 0.5);
      gfx.vignette.endFill();

      // Tube background
      gfx.tube.clear();
      gfx.tube.beginFill(COLORS.tube, 0.8);
      gfx.tube.drawRoundedRect(
        dims.tubeLeft, dims.tubeTop,
        CONFIG.tubeWidth, dims.tubeHeight,
        CONFIG.tubeRadius
      );
      gfx.tube.endFill();
      // Border
      gfx.tube.lineStyle(1, COLORS.tubeBorder, 0.5);
      gfx.tube.drawRoundedRect(
        dims.tubeLeft, dims.tubeTop,
        CONFIG.tubeWidth, dims.tubeHeight,
        CONFIG.tubeRadius
      );
    }

    // Draw sweet zone
    function drawSweet() {
      gfx.sweet.clear();
      const sweetBottom = dims.tubeTop + dims.tubeHeight * (1 - state.sweetStart01);
      const sweetTop = dims.tubeTop + dims.tubeHeight * (1 - state.sweetEnd01);
      const sweetHeight = sweetBottom - sweetTop;
      
      gfx.sweet.beginFill(COLORS.gold, CONFIG.sweetAlpha);
      gfx.sweet.drawRoundedRect(
        dims.innerLeft - 1, sweetTop,
        dims.innerWidth + 2, sweetHeight,
        4
      );
      gfx.sweet.endFill();
    }

    // Draw fill and head
    function drawDynamic() {
      const fillHeight = dims.tubeHeight * state.value01;
      const fillTop = dims.tubeTop + dims.tubeHeight - fillHeight;
      const headY = fillTop + CONFIG.headRadius;

      // Fill
      gfx.fill.clear();
      if (fillHeight > 2) {
        gfx.fill.beginFill(COLORS.fill, 0.6);
        gfx.fill.drawRoundedRect(
          dims.innerLeft, fillTop,
          dims.innerWidth, fillHeight,
          CONFIG.tubeRadius - CONFIG.innerPadding
        );
        gfx.fill.endFill();
      }

      // Head glow (when in sweet zone)
      gfx.headGlow.clear();
      const inSweet = state.value01 >= state.sweetStart01 && state.value01 <= state.sweetEnd01;
      if (inSweet && state.isHolding) {
        gfx.headGlow.beginFill(COLORS.sweetGlow, 0.25);
        gfx.headGlow.drawCircle(dims.cx, headY, CONFIG.headRadius + 6);
        gfx.headGlow.endFill();
      }

      // Head ball
      gfx.head.clear();
      // Main ball
      gfx.head.beginFill(COLORS.pearl, 0.95);
      gfx.head.drawCircle(dims.cx, headY, CONFIG.headRadius);
      gfx.head.endFill();
      // Highlight
      gfx.head.beginFill(COLORS.white, 0.5);
      gfx.head.drawCircle(dims.cx - 2, headY - 2, CONFIG.headRadius * 0.35);
      gfx.head.endFill();
    }

    // Initial draw
    drawStatic();
    drawSweet();
    drawDynamic();
    app.render();

    // Instance methods
    const instance = {
      update(data) {
        if (state.isLocked) return;
        
        state.targetValue01 = data.value01 ?? 0;
        state.sweetStart01 = data.sweetStart01 ?? 0.6;
        state.sweetEnd01 = data.sweetEnd01 ?? 0.8;
        state.isHolding = data.isHolding ?? false;
        
        // Smooth interpolation
        state.value01 += (state.targetValue01 - state.value01) * 0.25;
        
        drawSweet();
        drawDynamic();
        app.render();
      },

      lock() {
        state.isLocked = true;
        state.isHolding = false;
        drawDynamic();
        app.render();
      },

      reset() {
        state.value01 = 0;
        state.targetValue01 = 0;
        state.isHolding = false;
        state.isLocked = false;
        drawDynamic();
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
  window.PixiTempo = { init };
})();
