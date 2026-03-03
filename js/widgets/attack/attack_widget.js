import { createTubeViewArc } from "../shared/tube/tube_view_arc.js";

const ATTACK_MIN = -6;
const ATTACK_MAX = 6;
const ATTACK_PERFECT_THRESHOLD_DEG = 0.05;
const ATTACK_POP_FX_MS = 220;
const ATTACK_BLUR_FX_MS = 100;
const ATTACK_PERFECT_FX_MS = 200;
const DEBUG_ATTACK_WIDGET = Boolean(globalThis.__ATTACK_WIDGET_DEBUG__ || globalThis.__DEV__);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function mapDegTo01(deg) {
  const d = clamp(deg, ATTACK_MIN, ATTACK_MAX);
  return clamp01((6 - d) / 12);
}

function fmtAttackDeg(deg) {
  const n = Number.isFinite(deg) ? deg : 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}°`;
}

function attackStateFromPhase({ phase, holdActive, locked }) {
  if (locked) return "locked";
  if (holdActive) return "hold";
  if (phase === "IDLE" || phase === "END") return "idle";
  return "active";
}

export function createAttackWidget() {
  const name = "attack";
  const view = createTubeViewArc({
    arcPathD: "M2 72 A58 58 0 0 1 118 72",
    viewBox: "0 0 120 90"
  });

  let mounted = false;
  let locked = false;
  let lastAttackDeg = 0;
  let readoutEl = null;
  let hostEl = null;
  let widgetRootEl = null;
  let popFxTimer = 0;
  let blurFxTimer = 0;
  let perfectFxTimer = 0;

  function getRunner() {
    const root =
      widgetRootEl ||
      hostEl?.closest?.('[data-widget="attack"]') ||
      document.querySelector('#swingMetricsRow [data-widget="attack"]') ||
      document.querySelector('#swingMetricsRow .metricCard--attack') ||
      hostEl;
    return root?.querySelector("#attackAngleRunner") || root?.querySelector(".tubeArc__runner") || null;
  }

  function clearFxTimers() {
    if (popFxTimer) {
      window.clearTimeout(popFxTimer);
      popFxTimer = 0;
    }
    if (blurFxTimer) {
      window.clearTimeout(blurFxTimer);
      blurFxTimer = 0;
    }
    if (perfectFxTimer) {
      window.clearTimeout(perfectFxTimer);
      perfectFxTimer = 0;
    }
  }

  function resetRunnerFxClasses() {
    const runner = getRunner();
    if (!runner) return;
    runner.classList.remove("__holdFX", "__popFX", "__blurFX", "__perfectFX");
  }

  function setHoldFx(active) {
    const runner = getRunner();
    if (!runner) return;
    runner.classList.toggle("__holdFX", !!active);
  }

  // Visual-only feedback classes; must never affect attack angle math or gameplay state.
  function triggerReleaseFx(attackDeg) {
    const runner = getRunner();
    if (!runner) return;

    clearFxTimers();
    runner.classList.remove("__holdFX", "__popFX", "__blurFX", "__perfectFX");
    void runner.offsetWidth;
    runner.classList.add("__popFX", "__blurFX");

    blurFxTimer = window.setTimeout(() => {
      const el = getRunner();
      el?.classList.remove("__blurFX");
      blurFxTimer = 0;
    }, ATTACK_BLUR_FX_MS);

    popFxTimer = window.setTimeout(() => {
      const el = getRunner();
      el?.classList.remove("__popFX");
      popFxTimer = 0;
    }, ATTACK_POP_FX_MS);

    const deg = Number(attackDeg);
    if (Number.isFinite(deg) && Math.abs(deg) <= ATTACK_PERFECT_THRESHOLD_DEG) {
      runner.classList.add("__perfectFX");
      perfectFxTimer = window.setTimeout(() => {
        const el = getRunner();
        el?.classList.remove("__perfectFX");
        perfectFxTimer = 0;
      }, ATTACK_PERFECT_FX_MS);
    }
  }

  function render(deg, visualState) {
    const d = clamp(deg, ATTACK_MIN, ATTACK_MAX);
    const runner01 = mapDegTo01(d);
    lastAttackDeg = d;
    view.setState(visualState);
    view.setProgress01(runner01);
    view.setValueDeg(d);
    if (readoutEl) readoutEl.textContent = fmtAttackDeg(d);
    return { deg: d, runner01 };
  }

  function resolveHost(rootEl, ui) {
    const mount = rootEl || ui?.attack?.container || ui?.attack?.mount || document.getElementById("attackMount");
    if (!mount) return null;
    if (mount.id === "attackAngle") return mount;
    let host = mount.querySelector("#attackAngle");
    if (!host) {
      host = document.createElement("div");
      host.id = "attackAngle";
      host.className = "metricWidgetHost";
      mount.appendChild(host);
    }
    return host;
  }

  function mount({ rootEl, ui } = {}) {
    if (mounted) return;
    hostEl = resolveHost(rootEl, ui);
    if (!hostEl) return;
    widgetRootEl =
      hostEl.closest('[data-widget="attack"]') ||
      document.querySelector('#swingMetricsRow [data-widget="attack"]') ||
      document.querySelector('#swingMetricsRow .metricCard--attack');
    readoutEl = document.getElementById("attackAngleReadout");
    view.mount(hostEl);
    mounted = true;
    locked = false;
    clearFxTimers();
    resetRunnerFxClasses();
    render(0, "idle");
  }

  function update({ phase = "IDLE", state, snapshot } = {}) {
    if (!mounted) mount({ ui: state?.uiRefs });
    if (!mounted) return;

    const fromSnapshot = snapshot?.attackDeg;
    const fromState = state?.shot?.attackDeg;
    const attackDeg = Number.isFinite(fromSnapshot) ? fromSnapshot : fromState;

    const holdActive = !locked && phase === "ARMING" && (state?.tempo?.holding ?? state?.hand?.holding ?? true);
    const visualState = attackStateFromPhase({ phase, holdActive, locked: locked || !!state?.shot?.locked });
    setHoldFx(holdActive);

    if (locked) return;
    const frame = render(attackDeg, visualState);
    if (DEBUG_ATTACK_WIDGET) {
      const runner = view.getDebugSnapshot?.();
      console.debug("[attack-widget]", {
        deg: frame.deg,
        t01: frame.runner01,
        stageW: runner?.stageW ?? null,
        left: runner?.left ?? null,
        top: runner?.top ?? null
      });
    }
  }

  function lock({ snapshot, state } = {}) {
    locked = true;
    const attackDeg = Number.isFinite(snapshot?.attackDeg) ? snapshot.attackDeg : state?.shot?.attackDeg;
    render(attackDeg, "locked");
    triggerReleaseFx(attackDeg);
  }

  function reset() {
    locked = false;
    clearFxTimers();
    resetRunnerFxClasses();
    render(0, "idle");
  }

  function destroy() {
    clearFxTimers();
    resetRunnerFxClasses();
    view.destroy();
    mounted = false;
    locked = false;
    readoutEl = null;
    lastAttackDeg = 0;
    hostEl = null;
    widgetRootEl = null;
  }

  function getValue() {
    return { attackDeg: lastAttackDeg };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
