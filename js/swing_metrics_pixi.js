/**
 * Swing Metrics Pixi — Premium B-Style Overlay
 * 
 * Renders the three swing metrics (Tempo, Path, Attack Angle)
 * in a Pixi canvas overlay with premium minimal styling.
 * 
 * Visual style: dark graphite, champagne-gold accents, subtle glow
 */

// Colors
const COLORS = {
  gold: 0xD8C8A6,
  goldSoft: 0xCDBB8A,
  pearl: 0xF5F0E8,
  white: 0xFFFFFF,
  track: 0x3A3D42,
  trackSoft: 0x2A2D32,
  glow: 0xD8C8A6
};

// Config
const CONFIG = {
  // Tempo (vertical capsule)
  tempo: {
    trackWidth: 12,
    trackHeight: 64,
    runnerRadius: 5,
    sweetStart: 0.55,
    sweetEnd: 0.75
  },
  // Path (arc)
  path: {
    radius: 38,
    strokeWidth: 6,
    arcStart: -0.75 * Math.PI,
    arcEnd: -0.25 * Math.PI,
    sweetCenter: 0.5,
    sweetWidth: 0.2,
    runnerRadius: 4.5
  },
  // Attack (plane)
  attack: {
    ringRadius: 36,
    ringStroke: 3,
    clubLength: 28,
    clubHeadRadius: 3.5,
    centerRadius: 3
  }
};

// Module state
let app = null;
let stage = null;
let containers = {
  tempo: null,
  path: null,
  attack: null
};
let graphics = {
  tempo: {},
  path: {},
  attack: {}
};
let getLayoutFn = null;
let lastData = null;
let initialized = false;

/**
 * Initialize the Pixi swing metrics overlay
 */
export function initSwingMetricsPixi({ mountEl, getLayout }) {
  if (!mountEl || !window.PIXI) {
    console.warn("[SwingMetricsPixi] Missing mountEl or PIXI");
    return;
  }
  
  getLayoutFn = getLayout;
  
  // Create Pixi application with manual rendering
  app = new PIXI.Application({
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    autoStart: false // Manual render only
  });
  
  // Size to container
  const rect = mountEl.getBoundingClientRect();
  app.renderer.resize(rect.width, rect.height);
  
  // Append canvas
  mountEl.appendChild(app.view);
  app.view.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  
  stage = app.stage;
  
  // Create containers for each widget
  containers.tempo = new PIXI.Container();
  containers.path = new PIXI.Container();
  containers.attack = new PIXI.Container();
  
  stage.addChild(containers.tempo);
  stage.addChild(containers.path);
  stage.addChild(containers.attack);
  
  // Build graphics for each
  buildTempoGraphics();
  buildPathGraphics();
  buildAttackGraphics();
  
  // Position based on layout
  updateLayout();
  
  initialized = true;
  
  // Initial render
  app.render();
  
  console.log("[SwingMetricsPixi] Initialized");
}

/**
 * Build Tempo graphics (vertical capsule)
 */
function buildTempoGraphics() {
  const c = containers.tempo;
  const cfg = CONFIG.tempo;
  
  // Track background
  const track = new PIXI.Graphics();
  track.beginFill(COLORS.trackSoft, 0.6);
  track.drawRoundedRect(-cfg.trackWidth/2, -cfg.trackHeight/2, cfg.trackWidth, cfg.trackHeight, cfg.trackWidth/2);
  track.endFill();
  c.addChild(track);
  graphics.tempo.track = track;
  
  // Track border
  const trackBorder = new PIXI.Graphics();
  trackBorder.lineStyle(1.5, COLORS.white, 0.12);
  trackBorder.drawRoundedRect(-cfg.trackWidth/2, -cfg.trackHeight/2, cfg.trackWidth, cfg.trackHeight, cfg.trackWidth/2);
  c.addChild(trackBorder);
  
  // Sweet zone band
  const sweet = new PIXI.Graphics();
  const sweetY1 = cfg.trackHeight/2 - cfg.sweetEnd * cfg.trackHeight;
  const sweetY2 = cfg.trackHeight/2 - cfg.sweetStart * cfg.trackHeight;
  const sweetH = sweetY2 - sweetY1;
  sweet.beginFill(COLORS.gold, 0.18);
  sweet.drawRect(-cfg.trackWidth/2 + 1, sweetY1, cfg.trackWidth - 2, sweetH);
  sweet.endFill();
  c.addChild(sweet);
  graphics.tempo.sweet = sweet;
  
  // Runner glow (behind)
  const runnerGlow = new PIXI.Graphics();
  runnerGlow.beginFill(COLORS.pearl, 0.25);
  runnerGlow.drawCircle(0, 0, cfg.runnerRadius + 3);
  runnerGlow.endFill();
  c.addChild(runnerGlow);
  graphics.tempo.runnerGlow = runnerGlow;
  
  // Runner
  const runner = new PIXI.Graphics();
  runner.beginFill(COLORS.pearl, 0.95);
  runner.drawCircle(0, 0, cfg.runnerRadius);
  runner.endFill();
  // Highlight
  runner.beginFill(COLORS.white, 0.6);
  runner.drawCircle(-1.5, -1.5, cfg.runnerRadius * 0.35);
  runner.endFill();
  c.addChild(runner);
  graphics.tempo.runner = runner;
}

/**
 * Build Path graphics (arc)
 */
function buildPathGraphics() {
  const c = containers.path;
  const cfg = CONFIG.path;
  
  // Arc track
  const arcTrack = new PIXI.Graphics();
  arcTrack.lineStyle(cfg.strokeWidth, COLORS.track, 0.5);
  arcTrack.arc(0, 0, cfg.radius, cfg.arcStart, cfg.arcEnd);
  c.addChild(arcTrack);
  graphics.path.track = arcTrack;
  
  // Arc border (outer)
  const arcBorder = new PIXI.Graphics();
  arcBorder.lineStyle(1, COLORS.white, 0.08);
  arcBorder.arc(0, 0, cfg.radius + cfg.strokeWidth/2, cfg.arcStart, cfg.arcEnd);
  c.addChild(arcBorder);
  
  // Sweet segment
  const sweetArc = new PIXI.Graphics();
  const sweetStart = cfg.arcStart + (cfg.arcEnd - cfg.arcStart) * (cfg.sweetCenter - cfg.sweetWidth/2);
  const sweetEnd = cfg.arcStart + (cfg.arcEnd - cfg.arcStart) * (cfg.sweetCenter + cfg.sweetWidth/2);
  sweetArc.lineStyle(cfg.strokeWidth - 1, COLORS.gold, 0.35);
  sweetArc.arc(0, 0, cfg.radius, sweetStart, sweetEnd);
  c.addChild(sweetArc);
  graphics.path.sweet = sweetArc;
  
  // Center ball (impact point)
  const centerBall = new PIXI.Graphics();
  centerBall.beginFill(COLORS.pearl, 0.4);
  centerBall.drawCircle(0, cfg.radius + 10, 3);
  centerBall.endFill();
  c.addChild(centerBall);
  
  // Runner glow
  const runnerGlow = new PIXI.Graphics();
  runnerGlow.beginFill(COLORS.pearl, 0.2);
  runnerGlow.drawCircle(0, 0, cfg.runnerRadius + 2.5);
  runnerGlow.endFill();
  c.addChild(runnerGlow);
  graphics.path.runnerGlow = runnerGlow;
  
  // Runner
  const runner = new PIXI.Graphics();
  runner.beginFill(COLORS.pearl, 0.92);
  runner.drawCircle(0, 0, cfg.runnerRadius);
  runner.endFill();
  runner.beginFill(COLORS.white, 0.5);
  runner.drawCircle(-1.2, -1.2, cfg.runnerRadius * 0.3);
  runner.endFill();
  c.addChild(runner);
  graphics.path.runner = runner;
}

/**
 * Build Attack graphics (plane with tilting club)
 */
function buildAttackGraphics() {
  const c = containers.attack;
  const cfg = CONFIG.attack;
  
  // Outer ring
  const ring = new PIXI.Graphics();
  ring.lineStyle(cfg.ringStroke, COLORS.track, 0.45);
  ring.drawCircle(0, 0, cfg.ringRadius);
  c.addChild(ring);
  graphics.attack.ring = ring;
  
  // Ring highlight
  const ringHighlight = new PIXI.Graphics();
  ringHighlight.lineStyle(1, COLORS.white, 0.06);
  ringHighlight.drawCircle(0, 0, cfg.ringRadius + cfg.ringStroke/2);
  c.addChild(ringHighlight);
  
  // Horizon line
  const horizon = new PIXI.Graphics();
  horizon.lineStyle(1.5, COLORS.white, 0.12);
  horizon.moveTo(-cfg.ringRadius + 6, 0);
  horizon.lineTo(cfg.ringRadius - 6, 0);
  c.addChild(horizon);
  graphics.attack.horizon = horizon;
  
  // Club container (for rotation)
  const clubContainer = new PIXI.Container();
  c.addChild(clubContainer);
  graphics.attack.clubContainer = clubContainer;
  
  // Club shaft
  const shaft = new PIXI.Graphics();
  shaft.lineStyle(2, COLORS.goldSoft, 0.5);
  shaft.moveTo(0, 0);
  shaft.lineTo(0, -cfg.clubLength);
  clubContainer.addChild(shaft);
  graphics.attack.shaft = shaft;
  
  // Club head
  const clubHead = new PIXI.Graphics();
  clubHead.beginFill(COLORS.gold, 0.65);
  clubHead.drawCircle(0, -cfg.clubLength, cfg.clubHeadRadius);
  clubHead.endFill();
  // Highlight
  clubHead.beginFill(COLORS.white, 0.3);
  clubHead.drawCircle(-0.8, -cfg.clubLength - 0.8, cfg.clubHeadRadius * 0.35);
  clubHead.endFill();
  clubContainer.addChild(clubHead);
  graphics.attack.clubHead = clubHead;
  
  // Center ball
  const centerBall = new PIXI.Graphics();
  centerBall.beginFill(COLORS.pearl, 0.85);
  centerBall.drawCircle(0, 0, cfg.centerRadius);
  centerBall.endFill();
  centerBall.beginFill(COLORS.white, 0.5);
  centerBall.drawCircle(-0.8, -0.8, cfg.centerRadius * 0.35);
  centerBall.endFill();
  c.addChild(centerBall);
  graphics.attack.centerBall = centerBall;
}

/**
 * Update layout positions based on DOM widget rects
 */
function updateLayout() {
  if (!getLayoutFn || !app) return;
  
  const layout = getLayoutFn();
  if (!layout) return;
  
  const canvasRect = app.view.getBoundingClientRect();
  
  // Position each container at center of its widget
  if (layout.tempo && containers.tempo) {
    const r = layout.tempo;
    containers.tempo.x = r.left + r.width/2 - canvasRect.left;
    containers.tempo.y = r.top + r.height/2 - canvasRect.top;
  }
  
  if (layout.path && containers.path) {
    const r = layout.path;
    containers.path.x = r.left + r.width/2 - canvasRect.left;
    containers.path.y = r.top + r.height/2 - canvasRect.top;
  }
  
  if (layout.attack && containers.attack) {
    const r = layout.attack;
    containers.attack.x = r.left + r.width/2 - canvasRect.left;
    containers.attack.y = r.top + r.height/2 - canvasRect.top;
  }
}

/**
 * Update swing metrics visuals
 */
export function updateSwingMetricsPixi(data) {
  if (!initialized || !app) return;
  
  lastData = data;
  const { phase, tempo01, path01, attackDeg, locked } = data;
  
  // Update Tempo
  updateTempo(tempo01);
  
  // Update Path
  updatePath(path01);
  
  // Update Attack
  updateAttack(attackDeg);
  
  // Render
  app.render();
}

/**
 * Update Tempo visual
 */
function updateTempo(value01) {
  const cfg = CONFIG.tempo;
  const y = cfg.trackHeight/2 - value01 * cfg.trackHeight;
  
  if (graphics.tempo.runner) {
    graphics.tempo.runner.y = y;
  }
  if (graphics.tempo.runnerGlow) {
    graphics.tempo.runnerGlow.y = y;
  }
}

/**
 * Update Path visual
 */
function updatePath(value01) {
  const cfg = CONFIG.path;
  const angle = cfg.arcStart + (cfg.arcEnd - cfg.arcStart) * value01;
  const x = Math.cos(angle) * cfg.radius;
  const y = Math.sin(angle) * cfg.radius;
  
  if (graphics.path.runner) {
    graphics.path.runner.x = x;
    graphics.path.runner.y = y;
  }
  if (graphics.path.runnerGlow) {
    graphics.path.runnerGlow.x = x;
    graphics.path.runnerGlow.y = y;
  }
}

/**
 * Update Attack visual
 */
function updateAttack(deg) {
  // Map degrees to rotation: negative = tilted left, positive = tilted right
  // Visual multiplier for clarity
  const visualMult = 4;
  const rotation = (deg || 0) * visualMult * (Math.PI / 180);
  
  if (graphics.attack.clubContainer) {
    graphics.attack.clubContainer.rotation = rotation;
  }
}

/**
 * Resize handler
 */
export function resizeSwingMetricsPixi() {
  if (!app || !app.view.parentElement) return;
  
  const rect = app.view.parentElement.getBoundingClientRect();
  app.renderer.resize(rect.width, rect.height);
  
  updateLayout();
  
  if (lastData) {
    updateSwingMetricsPixi(lastData);
  } else {
    app.render();
  }
}

/**
 * Destroy and cleanup
 */
export function destroySwingMetricsPixi() {
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true });
    app = null;
  }
  stage = null;
  containers = { tempo: null, path: null, attack: null };
  graphics = { tempo: {}, path: {}, attack: {} };
  initialized = false;
  lastData = null;
}

// Export for debugging
export function getPixiApp() {
  return app;
}
