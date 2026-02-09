import { SwingControls } from "../../swing_controls.js";

export function createTempoWidget() {
  const name = "tempo";
  let mounted = false;
  let locked = false;
  let lastValue = 0;
  let getState = null;
  let root = null;
  let tempoRoot = null;
  let els = {
    control: null,
    fill: null,
    runner: null,
    tube: null,
    pct: null
  };

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function cacheEls(ui) {
    els.control = ui?.tempo?.control || document.getElementById("swingTempoControl");
    els.fill = ui?.tempo?.fill || document.getElementById("swingTempoFill");
    els.runner = ui?.tempo?.runner || document.getElementById("swingTempoRunner");
    els.tube = ui?.tempo?.tube || document.getElementById("swingTempoTube");
    els.pct = ui?.tempo?.pct || document.getElementById("swingTempoPct");
    tempoRoot = (els.tube || els.runner)?.closest?.(".swing-metric--tempo") || null;
    root =
      tempoRoot ||
      document.querySelector("#swingMetricsRow .swing-metric--tempo") ||
      null;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function mapRunnerT(v) {
    return easeOutQuad(clamp01(v));
  }

  function setMaterialVars(tempo01, holdActive) {
    if (!root) return;
    root.style.setProperty("--tempoP", String(clamp01(tempo01)));
    root.style.setProperty("--tempoHold", holdActive ? "1" : "0");
  }

  function setHoldClass(active) {
    const el = els.control || document.getElementById("swingTempoControl");
    if (!el?.classList) return;
    el.classList.toggle("is-hold", !!active);
  }

  function setIdleClass(active) {
    const el = tempoRoot || root;
    if (!el?.classList) return;
    el.classList.toggle("is-idle", !!active);
  }

  function render(p) {
    const tRaw = clamp01(p);
    const t = mapRunnerT(tRaw);
    lastValue = tRaw;
    const fill = els.fill || document.getElementById("swingTempoFill");
    const runner = els.runner || document.getElementById("swingTempoRunner");
    const tube = els.tube || document.getElementById("swingTempoTube");
    if (runner && tube) {
      const tubeRect = tube.getBoundingClientRect();
      const tubeH = tube.clientHeight || tubeRect.height || 0;
      const runnerStyle = window.getComputedStyle(runner);
      const runnerH =
        runner.offsetHeight ||
        Number.parseFloat(runnerStyle.height) ||
        0;
      const inset = Math.max(2, Math.round(runnerH * 0.25));
      const minBottom = inset;
      const maxBottom = Math.max(minBottom, tubeH - runnerH - inset);
      const yFinal = minBottom + (maxBottom - minBottom) * t;

      tube.style.setProperty("--tempoRunnerY", `${yFinal.toFixed(2)}px`);

      if (fill && tubeH > 0) {
        const fillHeightPx = yFinal + runnerH * 0.5;
        const fillPctFromRunner = clamp01(fillHeightPx / tubeH) * 100;
        const shouldUseVisualFloor = tRaw <= 0.001;
        const vf = shouldUseVisualFloor ? Math.max(tRaw, 0.08) : tRaw;
        const floorPct = shouldUseVisualFloor ? vf * 100 : 0;
        const fillPct = Math.max(fillPctFromRunner, floorPct);
        fill.style.height = `${fillPct.toFixed(2)}%`;
      } else if (fill) {
        fill.style.height = "8%";
      }

      if (window.__DEBUG_TEMPO__) {
        console.log("[TEMPO] unified fill+runner", {
          tRaw,
          t,
          tubeH,
          runnerH,
          yFinal
        });
      }
    } else if (fill) {
      fill.style.height = "8%";
    }
    if (els.pct) els.pct.textContent = `${Math.round(tRaw * 100)}%`;
  }

  function mount({ getState: getStateFn, ui } = {}) {
    if (mounted) return;
    getState = getStateFn || null;
    cacheEls(ui);
    setHoldClass(false);
    setIdleClass(false);
    render(0);
    mounted = true;
  }

  function update({ phase, state: stateArg, holding } = {}) {
    if (!mounted) mount();
    const state = stateArg || (typeof getState === "function" ? getState() : null);
    const head01 = Number.isFinite(state?.shot?.tempo01)
      ? state.shot.tempo01
      : SwingControls.getTempoHeadPos();
    const control = els.control || document.getElementById("swingTempoControl");
    if (control && !control.classList.contains("is-ready")) {
      control.classList.add("is-ready");
    }
    const holdingState =
      typeof holding === "boolean"
        ? holding
        : typeof state?.tempo?.holding === "boolean"
          ? state.tempo.holding
          : typeof state?.ui?.tempoHold === "boolean"
            ? state.ui.tempoHold
            : undefined;
    const isIdle = phase === "IDLE" || (holdingState === false && phase !== "ARMING");
    setIdleClass(isIdle);
    const hasExplicitHoldFlag =
      typeof state?.tempo?.holding === "boolean" ||
      typeof state?.ui?.tempoHold === "boolean" ||
      typeof holding === "boolean";
    const holdSignal = hasExplicitHoldFlag
      ? !!(state?.tempo?.holding || state?.ui?.tempoHold || holding)
      : phase === "ARMING";
    const holdActive = !!holdSignal && !state?.shot?.locked;
    setHoldClass(holdActive);
    setMaterialVars(head01, holdActive);

    if (locked || phase !== "ARMING") return;
    render(head01);
  }

  function lock() {
    locked = true;
    setHoldClass(false);
    setIdleClass(false);
    setMaterialVars(lastValue, false);
    render(lastValue);
  }

  function reset() {
    locked = false;
    setHoldClass(false);
    setIdleClass(true);
    setMaterialVars(0, false);
    render(0);
  }

  function destroy() {
    setHoldClass(false);
    setIdleClass(false);
    setMaterialVars(0, false);
    mounted = false;
  }

  function getValue() {
    return { tempo01: lastValue };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
