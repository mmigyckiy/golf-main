import { createPathModel } from "./path_model.js";
import { SwingPath } from "../../swing_path.js";

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

export function createPathWidget() {
  const name = "path";
  const model = createPathModel();

  let mounted = false;
  let usePixi = false;
  let useDom = true;
  let pathMountEl = null;
  let pixiMountEl = null;
  let ringEl = null;

  function mount({ rootEl, ui, usePixiPreferred = true } = {}) {
    if (mounted) return { usePixi };

    window.ensureSwingPathCardStructure?.();

    pathMountEl = rootEl || ui?.path?.mount || document.getElementById("pathMount");
    pixiMountEl = ui?.path?.pixi || document.getElementById("pathPixi");
    ringEl = ui?.path?.ring || document.getElementById("alignmentRing");

    usePixi = false;
    useDom = true;

    const canUsePixi = !!(usePixiPreferred && window.SwingPathPixi?.init && pixiMountEl);
    if (canUsePixi) {
      window.ensureSwingPathCardStructure?.({ clearStage: true });
      pixiMountEl = document.getElementById("pathPixi") || pixiMountEl;
      usePixi = !!window.SwingPathPixi.init({ containerEl: pixiMountEl });
    }
    useDom = !usePixi;

    if (pathMountEl) {
      pathMountEl.classList.toggle("is-pixi-path", usePixi);
      pathMountEl.classList.toggle("is-dom-path", useDom);
    }
    if (ringEl) {
      ringEl.classList.toggle("is-legacyPathLayer", usePixi);
      if (usePixi) ringEl.setAttribute("aria-hidden", "true");
      else ringEl.removeAttribute("aria-hidden");
      ringEl.style.display = usePixi ? "none" : "";
    }

    if (useDom && ringEl) SwingPath.init();
    mounted = true;
    return { usePixi };
  }

  function update({ phase = "IDLE", dt = 16, snapshot, state } = {}) {
    if (!mounted) mount({ ui: state?.uiRefs });
    if (!mounted) return;

    const head01 = clamp01(
      Number.isFinite(snapshot?.path01) ? snapshot.path01 : (state?.alignment?.value ?? 0.5)
    );
    const intensity01 = clamp01(
      Number.isFinite(snapshot?.tempo01) ? snapshot.tempo01 : (state?.shot?.tempo01 ?? 0.5)
    );
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
      if (ringEl) ringEl.style.display = "none";
      return;
    }

    if (useDom) {
      if (ringEl) ringEl.style.display = "";
      SwingPath.update({
        phase,
        headPos01: model.getValue().path01,
        sweetCenter: state?.alignment?.sweetCenter ?? 0,
        sweetWidthDeg: 18
      });
    }
  }

  function lock() {
    model.lock();
    if (useDom) SwingPath.lockPath();
  }

  function reset() {
    model.reset();
    if (useDom) SwingPath.resetPath();
    if (usePixi && window.SwingPathPixi?.update) {
      window.SwingPathPixi.update({
        headPos01: 0.5,
        sweetStart01: 0.41,
        sweetEnd01: 0.59,
        locked: false,
        intensity01: 0.5,
        dtMs: 16
      });
    }
  }

  function destroy() {
    if (usePixi && window.SwingPathPixi?.destroy) {
      window.SwingPathPixi.destroy();
    }
    mounted = false;
    usePixi = false;
    useDom = true;
    pathMountEl = null;
    pixiMountEl = null;
    ringEl = null;
  }

  function getValue() {
    return { path01: model.getValue().path01 };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
