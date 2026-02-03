import { createTempoWidget } from "./tempo/tempo_widget.js";
import { createPathWidget } from "./path/path_widget.js";
import { createAttackWidget } from "./attack/attack_widget.js";

export function createWidgetManager({ getState }) {
  const widgets = [
    createTempoWidget({ getState }),
    createPathWidget({ getState }),
    createAttackWidget({ getState })
  ];

  let mounted = false;

  function safeCall(fn, label) {
    try {
      return fn();
    } catch (err) {
      console.warn(`[WIDGET] ${label} failed`, err);
      return null;
    }
  }

  function mount() {
    if (mounted) return;
    widgets.forEach((w) => safeCall(() => w.mount?.(), `${w.name || "widget"}.mount`));
    mounted = true;
  }

  function update(ts, dt, phase) {
    if (!mounted) mount();
    const state = getState?.();
    widgets.forEach((w) => safeCall(() => w.update?.({ ts, dt, phase, state }), `${w.name || "widget"}.update`));
    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0, attackDeg: 0 } };
      const values = getValues();
      state.swing.values = { ...state.swing.values, ...values };
    }
  }

  function lock(ts) {
    const state = getState?.();
    widgets.forEach((w) => safeCall(() => w.lock?.({ ts, state }), `${w.name || "widget"}.lock`));
    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0, attackDeg: 0 } };
      state.swing.locked = true;
      state.swing.values = { ...state.swing.values, ...getValues() };
    }
  }

  function reset() {
    const state = getState?.();
    widgets.forEach((w) => safeCall(() => w.reset?.({ state }), `${w.name || "widget"}.reset`));
    if (state) {
      state.swing = state.swing || { locked: false, values: { tempo01: 0, path01: 0, attackDeg: 0 } };
      state.swing.locked = false;
      state.swing.values = { tempo01: 0, path01: 0.5, attackDeg: 0 };
    }
  }

  function destroy() {
    widgets.forEach((w) => safeCall(() => w.destroy?.(), `${w.name || "widget"}.destroy`));
    mounted = false;
  }

  function getValues() {
    const values = { tempo01: 0, path01: 0, attackDeg: 0 };
    widgets.forEach((w) => {
      const v = safeCall(() => w.getValue?.(), `${w.name || "widget"}.getValue`);
      if (v && typeof v === "object") {
        if (Number.isFinite(v.tempo01)) values.tempo01 = v.tempo01;
        if (Number.isFinite(v.path01)) values.path01 = v.path01;
        if (Number.isFinite(v.attackDeg)) values.attackDeg = v.attackDeg;
      }
    });
    return values;
  }

  return { mount, update, lock, reset, destroy, getValues };
}
