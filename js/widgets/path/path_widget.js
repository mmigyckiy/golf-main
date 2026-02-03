import { createPathModel } from "./path_model.js";
import { SwingPath } from "../../swing_path.js";

export function createPathWidget() {
  const name = "path";
  const model = createPathModel();
  let mounted = false;
  let usePixi = false;
  let mountEl = null;
  let hostEl = null;
  let getState = null;

  function mount({ getState: getStateFn, ui, usePixiPreferred = true } = {}) {
    if (mounted) return;
    getState = getStateFn || null;
    mountEl = ui?.path?.mount || document.getElementById("pathPixi");
    hostEl = document.querySelector(".swing-metric--path");
    if (usePixiPreferred && mountEl && window.SwingPathPixi?.init) {
      usePixi = !!window.SwingPathPixi.init({ containerEl: mountEl });
      if (!usePixi) {
        console.warn("[PathWidget] Pixi init failed; falling back to DOM.");
      }
    }
    if (usePixi && hostEl) {
      hostEl.classList.add("is-pixi-path");
    }
    mounted = true;
    return { usePixi };
  }

  function update({ phase, dt }) {
    if (!mounted) mount();
    const state = typeof getState === "function" ? getState() : null;
    const head01 = Number.isFinite(state?.shot?.path01)
      ? state.shot.path01
      : (state?.alignment?.value ?? 0.5);
    const intensity01 = Number.isFinite(state?.shot?.tempo01) ? state.shot.tempo01 : 0.5;
    model.update({ headPos01: head01, intensity: intensity01 });

    if (usePixi && window.SwingPathPixi?.update) {
      window.SwingPathPixi.update({
        headPos01: model.getValue().path01,
        sweetStart01: 0.41,
        sweetEnd01: 0.59,
        locked: phase !== "ARMING",
        intensity01,
        dtMs: dt
      });
    } else {
      SwingPath.update({ phase, headPos01: head01, sweetCenter: 0, sweetWidthDeg: 18 });
    }
  }

  function lock() {
    model.lock();
    SwingPath.lockPath();
    window.SwingPathPixi?.onRelease?.({ isSweet: false });
  }

  function reset() {
    model.reset();
    SwingPath.resetPath();
    window.SwingPathPixi?.reset?.();
  }

  function destroy() {
    mounted = false;
  }

  function getValue() {
    return { path01: model.getValue().path01 };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
