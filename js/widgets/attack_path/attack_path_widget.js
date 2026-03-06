// ============================================================
// Attack · Path — Combined Widget
// ============================================================
// Crosshair / Scope view: ball fixed at center, crosshair moves.
// Player must tap when the moving crosshair passes over the ball.
//
// ARMING simulation — "sniper aiming" motion:
//   The crosshair sweeps left-right (path) in a pendulum motion
//   with small up-down deviations (attack wobble) + fine tremor
//   on top — like steadying a rifle scope on a stationary target.
//
//   pathDeg   = 55 × (0.80·sin(t/T_sweep)  + 0.20·sin(t/T_tremor × 0.91))
//   attackDeg =  3 × (0.82·sin(t/T_wobble × 1.51 + φ) + 0.18·sin(t/T_tremor × 1.33))
//
//   When crosshair center is within sweet zones of BOTH axes → "is-sync"
//   On lock while in-sync → view.triggerPerfect() → 700ms flash
//
// Sweet zone thresholds:
//   ATTACK_SWEET_DEG = ±2°  (attack almost always within sweet zone)
//   PATH_SWEET_DEG   = ±5°  (path passes through center ~12% of time)
// ============================================================

import { createPathModel }      from "../path/path_model.js";
import { createAttackPathView } from "./attack_path_view.js";

const TWO_PI = 2 * Math.PI;

// Motion constants — pure pendulum, long travel
const SWEEP_PERIOD_MS  = 2800;   // slightly slower → more deliberate swing
const TREMOR_PERIOD_MS = 1400;   // very slow tremor (barely perceptible)
const SWEEP_MAX_DEG    = 58;     // ±58° — maximum travel (±60° max, 2° headroom)
const TREMOR_PATH_DEG  = 0.8;    // ±0.8° path micro-tremor (almost none)
const TREMOR_ATK_DEG   = 0.5;    // ±0.5° vertical tremble (nearly invisible)

const ATTACK_SWEET_DEG = 2;      // ±2° attack sweet zone
const PATH_SWEET_DEG   = 5;      // ±5° path sweet zone

export function createAttackPathWidget() {
  const view  = createAttackPathView();
  const model = createPathModel();

  let locked         = false;
  let _lastAttackDeg = 0;
  let _lastPath01    = 0.5;
  let _inSync        = false;   // true while both in sweet zone
  let _prevPhase     = "IDLE";  // track phase transitions
  let footerAttackEl = null;
  let footerPathEl   = null;

  // ── helpers ──────────────────────────────────────────────────

  function _checkSync(attackDeg, path01) {
    const pathDeg = (path01 - 0.5) * 120;
    return (Math.abs(attackDeg) <= ATTACK_SWEET_DEG &&
            Math.abs(pathDeg)  <= PATH_SWEET_DEG);
  }

  function _updateFooter(attackDeg, path01) {
    const pathDeg = (path01 - 0.5) * 120;
    if (footerAttackEl) {
      footerAttackEl.textContent =
        (attackDeg >= 0 ? "+" : "") + Number(attackDeg).toFixed(1) + "°";
    }
    if (footerPathEl) {
      if (Math.abs(pathDeg) < 0.5) {
        footerPathEl.textContent = "CENTER";
      } else {
        footerPathEl.textContent = pathDeg > 0
          ? `→ +${pathDeg.toFixed(1)}°`
          : `← ${Math.abs(pathDeg).toFixed(1)}°`;
      }
    }
  }

  // ── public API ───────────────────────────────────────────────

  function mount({ rootEl } = {}) {
    if (!rootEl) return;
    view.mount(rootEl);

    const card = rootEl.closest(".metricCard");
    footerAttackEl = card?.querySelector(".apFooter__attack");
    footerPathEl   = card?.querySelector(".apFooter__path");

    model.reset?.();
    locked = false;
    _lastAttackDeg = 0;
    _lastPath01    = 0.5;
    _inSync        = false;
  }

  function update({ phase = "IDLE", ts = 0, snapshot } = {}) {
    const holdActive = !locked && phase === "ARMING";
    view.setHoldFx(holdActive);
    view.setState(
      phase === "ARMING" ? "hold"
      : phase === "IDLE"  ? "idle"
      :                     "active"
    );

    if (locked) return;

    // New ARMING cycle starting → softly return ball to center before sweep
    if (holdActive && _prevPhase !== "ARMING") {
      view.setAttack(0);
      view.setPath01(0.5);
      model.update({ headPos01: 0.5 });
    }
    _prevPhase = phase;

    // Not ARMING — ball stays frozen at last position, nothing to update
    if (phase !== "ARMING") {
      if (_inSync) { _inSync = false; view.setSyncState(false); }
      return;
    }

    // ── Ball sweep simulation (ARMING only) ──────────────────
    const sweepA  = ts / SWEEP_PERIOD_MS  * TWO_PI;
    const tremorA = ts / TREMOR_PERIOD_MS * TWO_PI;

    const sweepDeg = Math.sin(sweepA)          * SWEEP_MAX_DEG
                   + Math.sin(tremorA * 1.37)  * TREMOR_PATH_DEG;
    model.update({ headPos01: sweepDeg / 120 + 0.5 });

    // Tiny vertical tremble (ignore app's ±6° attack preview — causes circles)
    const liveAttack = Math.sin(tremorA * 0.83 + 1.0) * TREMOR_ATK_DEG;
    view.setAttack(liveAttack);
    _lastAttackDeg = liveAttack;

    const { path01 } = model.getValue();
    _lastPath01 = path01;
    view.setPath01(path01);
    _updateFooter(liveAttack, path01);

    // ── Sync detection ────────────────────────────────────────
    const nowSync = _checkSync(liveAttack, path01);
    if (nowSync !== _inSync) {
      _inSync = nowSync;
      view.setSyncState(_inSync);
    }
  }

  function lock({ snapshot } = {}) {
    const wasSync = _inSync;
    locked = true;
    _inSync = false;
    view.setSyncState(false);

    // Always use the current simulation position — ball freezes exactly where it was
    // (ignoring snapshot to avoid jumps from app's real attack/path data)
    const attackDeg = _lastAttackDeg;
    const path01    = _lastPath01;

    model.update({ headPos01: path01 });
    model.lock?.();

    view.setAttack(attackDeg);
    view.setPath01(path01);
    view.setLocked(true);
    view.setState("locked");
    _updateFooter(attackDeg, path01);

    if (wasSync) view.triggerPerfect();
  }

  function reset() {
    locked         = false;
    _inSync        = false;
    _prevPhase     = "IDLE";
    // Note: _lastAttackDeg / _lastPath01 intentionally NOT reset here —
    // ball stays frozen at its last position until next ARMING begins.
    model.reset?.();
    // Only reset CSS states — do NOT call view.reset() (that snaps ball to center)
    view.setState("idle");
    view.setHoldFx(false);
    view.setSyncState(false);
    view.setLocked(false);
    _updateFooter(_lastAttackDeg, _lastPath01);
  }

  function getValue() {
    const { path01 } = model.getValue();
    return { path01, attackDeg: _lastAttackDeg };
  }

  function destroy() {
    view.destroy?.();
  }

  return { mount, update, lock, reset, getValue, destroy };
}
