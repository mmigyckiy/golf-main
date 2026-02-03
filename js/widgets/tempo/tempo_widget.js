import { SwingControls } from "../../swing_controls.js";

export function createTempoWidget({ getState }) {
  const name = "tempo";
  let mounted = false;
  let locked = false;
  let lastValue = 0;
  let els = {
    fill: null,
    runner: null,
    tube: null,
    pct: null
  };

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function cacheEls() {
    els.fill = document.getElementById("swingTempoFill");
    els.runner = document.getElementById("swingTempoRunner");
    els.tube = document.getElementById("swingTempoTube");
    els.pct = document.getElementById("swingTempoPct");
  }

  function render(p) {
    const v = clamp01(p);
    lastValue = v;
    if (els.fill) els.fill.style.height = `${(v * 100).toFixed(2)}%`;
    if (els.runner) {
      if (els.tube) {
        const pad = 8;
        const tubeH = els.tube.clientHeight || 0;
        const runnerH = els.runner.offsetHeight || 0;
        const travel = Math.max(0, tubeH - runnerH - pad * 2);
        const bottomPx = pad + travel * v;
        els.runner.style.bottom = `${bottomPx}px`;
      } else {
        els.runner.style.bottom = `calc(${(v * 100).toFixed(2)}% + 8px)`;
      }
    }
    if (els.pct) els.pct.textContent = `${Math.round(v * 100)}%`;
  }

  function mount() {
    if (mounted) return;
    cacheEls();
    render(0);
    mounted = true;
  }

  function update({ phase, state }) {
    if (!mounted) mount();
    if (locked || phase !== "ARMING") return;
    const head01 = Number.isFinite(state?.shot?.tempo01)
      ? state.shot.tempo01
      : SwingControls.getTempoHeadPos();
    render(head01);
  }

  function lock() {
    locked = true;
    render(lastValue);
  }

  function reset() {
    locked = false;
    render(0);
  }

  function getValue() {
    return { tempo01: lastValue };
  }

  return { name, mount, update, lock, reset, getValue };
}
