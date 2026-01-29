/**
 * Pixi Attack Angle Widget — Premium strike plane with club indicator
 * Outer ring, horizontal reference, tilting club with inertia
 */

(function() {
  'use strict';

  // Colors
  const COLORS = {
    ring: 0x3A3D42,
    ringHighlight: 0x4A4D52,
    horizon: 0x4A4D52,
    gold: 0xD8C8A6,
    goldSoft: 0xCDBB8A,
    pearl: 0xF5F0E8,
    white: 0xFFFFFF,
    clubShaft: 0xD8C8A6,
    clubHead: 0xCDBB8A
  };

  // Config
  const CONFIG = {
    ringRadius: 42,
    ringStroke: 3,
    clubLength: 28,
    clubHeadWidth: 8,
    clubHeadHeight: 4,
    ballRadius: 5,
    maxAngleDeg: 15,
    inertiaSmooth: 0.12 // Lower = more inertia, heavier feel
  };

  /**
   * Create an Attack Angle widget instance
   */
  function init(canvasEl, opts = {}) {
    if (!canvasEl || !window.PIXI) {
      console.warn("[PixiAttackAngle] Missing canvas or PIXI");
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
      attackDeg: 0,
      targetDeg: 0,
      renderedDeg: 0, // For inertia
      isHolding: false,
      isLocked: false
    };

    // Calculate dimensions
    const dims = {
      w, h,
      cx: w / 2,
      cy: h / 2
    };

    // Graphics elements
    const gfx = {
      vignette: new PIXI.Graphics(),
      ring: new PIXI.Graphics(),
      horizon: new PIXI.Graphics(),
      clubContainer: new PIXI.Container(),
      clubShaft: new PIXI.Graphics(),
      clubHead: new PIXI.Graphics(),
      ball: new PIXI.Graphics(),
      ballHighlight: new PIXI.Graphics()
    };

    // Build club container hierarchy
    gfx.clubContainer.addChild(gfx.clubShaft);
    gfx.clubContainer.addChild(gfx.clubHead);
    gfx.clubContainer.x = dims.cx;
    gfx.clubContainer.y = dims.cy;

    // Add to main container in order
    container.addChild(gfx.vignette);
    container.addChild(gfx.ring);
    container.addChild(gfx.horizon);
    container.addChild(gfx.clubContainer);
    container.addChild(gfx.ball);
    container.addChild(gfx.ballHighlight);

    // Draw static elements
    function drawStatic() {
      // Vignette
      gfx.vignette.clear();
      gfx.vignette.beginFill(0x000000, 0.1);
      gfx.vignette.drawCircle(dims.cx, dims.cy, CONFIG.ringRadius * 1.4);
      gfx.vignette.endFill();

      // Outer ring
      gfx.ring.clear();
      gfx.ring.lineStyle(CONFIG.ringStroke, COLORS.ring, 0.6);
      gfx.ring.drawCircle(dims.cx, dims.cy, CONFIG.ringRadius);
      // Inner highlight
      gfx.ring.lineStyle(1, COLORS.ringHighlight, 0.2);
      gfx.ring.drawCircle(dims.cx, dims.cy, CONFIG.ringRadius - CONFIG.ringStroke);

      // Horizontal reference line (very subtle)
      gfx.horizon.clear();
      gfx.horizon.lineStyle(1, COLORS.horizon, 0.25);
      gfx.horizon.moveTo(dims.cx - CONFIG.ringRadius + 8, dims.cy);
      gfx.horizon.lineTo(dims.cx + CONFIG.ringRadius - 8, dims.cy);

      // Center ball
      gfx.ball.clear();
      gfx.ball.beginFill(COLORS.pearl, 0.9);
      gfx.ball.drawCircle(dims.cx, dims.cy, CONFIG.ballRadius);
      gfx.ball.endFill();
      
      // Ball highlight
      gfx.ballHighlight.clear();
      gfx.ballHighlight.beginFill(COLORS.white, 0.45);
      gfx.ballHighlight.drawCircle(dims.cx - 1.5, dims.cy - 1.5, CONFIG.ballRadius * 0.35);
      gfx.ballHighlight.endFill();
    }

    // Draw club (rotates based on attack angle)
    function drawClub() {
      // Shaft
      gfx.clubShaft.clear();
      gfx.clubShaft.lineStyle(2.5, COLORS.clubShaft, 0.7);
      gfx.clubShaft.moveTo(0, 0);
      gfx.clubShaft.lineTo(0, -CONFIG.clubLength);

      // Club head at end of shaft
      gfx.clubHead.clear();
      gfx.clubHead.beginFill(COLORS.clubHead, 0.8);
      gfx.clubHead.drawRoundedRect(
        -CONFIG.clubHeadWidth / 2,
        -CONFIG.clubLength - CONFIG.clubHeadHeight / 2,
        CONFIG.clubHeadWidth,
        CONFIG.clubHeadHeight,
        2
      );
      gfx.clubHead.endFill();
      // Highlight
      gfx.clubHead.beginFill(COLORS.white, 0.25);
      gfx.clubHead.drawRoundedRect(
        -CONFIG.clubHeadWidth / 2 + 1,
        -CONFIG.clubLength - CONFIG.clubHeadHeight / 2 + 0.5,
        CONFIG.clubHeadWidth - 2,
        1.5,
        1
      );
      gfx.clubHead.endFill();
    }

    // Update club rotation with inertia
    function updateClubRotation() {
      // Apply inertia: rendered angle follows target with damping
      state.renderedDeg += (state.attackDeg - state.renderedDeg) * CONFIG.inertiaSmooth;
      
      // Convert to radians and apply visual multiplier
      const visualMult = 3; // Amplify for visibility
      const rotRad = state.renderedDeg * visualMult * (Math.PI / 180);
      gfx.clubContainer.rotation = rotRad;
    }

    // Initial draw
    drawStatic();
    drawClub();
    updateClubRotation();
    app.render();

    // Instance methods
    const instance = {
      update(data) {
        if (state.isLocked) return;
        
        state.targetDeg = data.attackDeg ?? 0;
        state.attackDeg = state.targetDeg;
        state.isHolding = data.isHolding ?? false;
        
        updateClubRotation();
        app.render();
      },

      lock() {
        state.isLocked = true;
        state.isHolding = false;
        // Final render with current state
        updateClubRotation();
        app.render();
      },

      reset() {
        state.attackDeg = 0;
        state.targetDeg = 0;
        state.renderedDeg = 0;
        state.isHolding = false;
        state.isLocked = false;
        gfx.clubContainer.rotation = 0;
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
  window.PixiAttackAngle = { init };
})();
