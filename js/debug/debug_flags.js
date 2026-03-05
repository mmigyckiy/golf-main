// ============================================================
// Debug Flags — centralised debug namespace
// ============================================================
// All opt-in debug toggles live here under __DRIVIX_DEBUG__.
// Enable in console: window.__DRIVIX_DEBUG__.dev = true
//
// Flags:
//   dev         — general dev/verbose logging
//   attack      — Attack Angle widget internals
//   swingLayers — marks swing layer DOM rects on startup
//   pathPick    — click-to-inspect DOM chain in Swing Path area
// ============================================================

window.__DRIVIX_DEBUG__ = window.__DRIVIX_DEBUG__ || {
  dev:         false,
  attack:      false,
  swingLayers: false,
  pathPick:    false,
};
