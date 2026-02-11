import { createTempoWidget } from "./tempo/tempo_widget.js";
import { createPathWidget } from "./path/path_widget.js";
import { createAttackWidget } from "./attack/attack_widget.js";

function safeCall(fn, label) {
  try {
    return fn();
  } catch (err) {
    console.warn(`[WIDGET] ${label} failed`, err);
    return null;
  }
}

function buildSnapshot(state) {
  return {
    tempo01: Number.isFinite(state?.shot?.tempo01) ? state.shot.tempo01 : 0,
    path01: Number.isFinite(state?.shot?.path01) ? state.shot.path01 : 0.5,
    attackDeg: Number.isFinite(state?.shot?.attackDeg) ? state.shot.attackDeg : 0
  };
}

export function createWidgetManager({ getState, ui }) {
  const registry = {
    tempo: createTempoWidget(),
    path: createPathWidget(),
    attack: createAttackWidget()
  };
  const order = ["tempo", "path", "attack"];
  let mounted = false;
  let pathPixiActive = false;

  function mount() {
    if (mounted) return;
    const root = ui?.common?.swingMetricsRow || document.getElementById("swingMetricsRow");

    order.forEach((key) => {
      const widget = registry[key];
      const slot = root?.querySelector?.(`[data-widget="${key}"] .metricCard__body`);
      const res = safeCall(
        () => widget.mount?.({ rootEl: slot || null, getState, ui, usePixiPreferred: true }),
        `${key}.mount`
      );
      if (key === "path" && res && typeof res.usePixi === "boolean") {
        pathPixiActive = res.usePixi;
      }
    });

    const state = getState?.();
    if (state) {
      state.flags = state.flags || {};
      state.flags.pathPixiActive = pathPixiActive;
    }
    mounted = true;
  }

  function update({ phase = "IDLE", dt = 16, ts = performance.now(), snapshot: incoming } = {}) {
    if (!mounted) mount();
    const state = getState?.();
    const snapshot = incoming || buildSnapshot(state);

    order.forEach((key) => {
      const widget = registry[key];
      safeCall(
        () => widget.update?.({ phase, dt, ts, snapshot, state, pathPixiActive }),
        `${key}.update`
      );
    });

    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0.5, attackDeg: 0 } };
      state.swing.values = { ...state.swing.values, ...getValues() };
    }
  }

  function lock(ctx = {}) {
    const payload = (ctx && typeof ctx === "object") ? ctx : {};
    const state = getState?.();
    const snapshot = payload.snapshot || buildSnapshot(state);
    order.forEach((key) => {
      const widget = registry[key];
      safeCall(() => widget.lock?.({ ...payload, state, snapshot }), `${key}.lock`);
    });
    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0.5, attackDeg: 0 } };
      state.swing.locked = true;
      state.swing.values = { ...state.swing.values, ...getValues() };
    }
  }

  function reset(ctx = {}) {
    const payload = (ctx && typeof ctx === "object") ? ctx : {};
    const state = getState?.();
    order.forEach((key) => {
      const widget = registry[key];
      safeCall(() => widget.reset?.({ ...payload, state }), `${key}.reset`);
    });
    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0.5, attackDeg: 0 } };
      state.swing.locked = false;
      state.swing.values = { tempo01: 0, path01: 0.5, attackDeg: 0 };
    }
  }

  function destroy() {
    order.forEach((key) => {
      const widget = registry[key];
      safeCall(() => widget.destroy?.(), `${key}.destroy`);
    });
    mounted = false;
    pathPixiActive = false;
  }

  function getValues() {
    const values = { tempo01: 0, path01: 0.5, attackDeg: 0 };
    order.forEach((key) => {
      const widget = registry[key];
      const v = safeCall(() => widget.getValue?.(), `${key}.getValue`);
      if (!v || typeof v !== "object") return;
      if (Number.isFinite(v.tempo01)) values.tempo01 = v.tempo01;
      if (Number.isFinite(v.path01)) values.path01 = v.path01;
      if (Number.isFinite(v.attackDeg)) values.attackDeg = v.attackDeg;
    });
    return values;
  }

  return { mount, update, lock, reset, destroy, getValues };
}
