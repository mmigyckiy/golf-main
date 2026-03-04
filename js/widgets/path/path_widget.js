import { createPathModel } from "./path_model.js";
import { createPathViewSector } from "./path_view_sector.js";

const MAX_DEG         = 20;   // must match path_view_sector.js
const SWEEP_PERIOD_MS = 2800; // one full left→right→left sweep cycle (~2.8 s)

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

export function createPathWidget() {
  const name = "path";
  const model = createPathModel();
  const view  = createPathViewSector();

  let mounted = false;
  let locked  = false;
  let footerValueEl = null;

  function mount({ rootEl, ui } = {}) {
    if (mounted) return { usePixi: false };

    const bodyEl =
      rootEl ||
      ui?.path?.mount ||
      document.getElementById("pathMount");

    view.mount(bodyEl);
    footerValueEl = document.querySelector("#pathFooter .metricCard__value");
    mounted = true;
    locked  = false;
    return { usePixi: false };
  }

  function _updateFooter(path01) {
    if (!footerValueEl) return;
    const deg = (path01 - 0.5) * 40;   // map 0–1 → -20…+20
    if (Math.abs(deg) < 0.5) {
      footerValueEl.textContent = "CENTER";
    } else if (deg > 0) {
      footerValueEl.textContent = `→ +${deg.toFixed(1)}°`;
    } else {
      footerValueEl.textContent = `← ${Math.abs(deg).toFixed(1)}°`;
    }
  }

  function update({ phase = "IDLE", ts = 0, snapshot, state } = {}) {
    if (!mounted) mount({ ui: state?.uiRefs });
    if (!mounted) return;

    // Hold = player is in arming phase and not yet released
    const holding = !locked && phase === "ARMING";
    view.setHoldFx(holding);

    if (locked) return;

    if (phase === "ARMING") {
      // Pendulum sweep — needle scans the full arc, emulating the player's gaze
      const sweepDeg = Math.sin(ts / SWEEP_PERIOD_MS * 2 * Math.PI) * MAX_DEG;
      model.update({ headPos01: sweepDeg / (2 * MAX_DEG) + 0.5 });
    }
    // IDLE / END: model stays at last value until reset()

    const { path01 } = model.getValue();
    view.setPath01(path01);
    _updateFooter(path01);
  }

  function lock({ snapshot, state } = {}) {
    locked = true;
    model.lock();
    view.setHoldFx(false);
    view.setLocked(true);
    view.triggerPopFx();
  }

  function reset() {
    locked = false;
    model.reset();
    view.setHoldFx(false);
    view.reset();
    if (footerValueEl) footerValueEl.textContent = "—";
  }

  function destroy() {
    view.destroy();
    mounted       = false;
    locked        = false;
    footerValueEl = null;
  }

  function getValue() {
    return { path01: model.getValue().path01 };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
