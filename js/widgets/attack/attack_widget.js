import { createTubeViewArc } from "../shared/tube/tube_view_arc.js";

const ATTACK_MIN = -6;
const ATTACK_MAX = 6;
const DEBUG_ATTACK_WIDGET = Boolean(globalThis.__ATTACK_WIDGET_DEBUG__ || globalThis.__DEV__);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function mapDegTo01(deg) {
  const d = clamp(deg, ATTACK_MIN, ATTACK_MAX);
  return clamp01((d + 6) / 12);
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
    arcPathD: "M18 70 A44 44 0 0 1 102 70",
    viewBox: "0 0 120 90"
  });

  let mounted = false;
  let locked = false;
  let lastAttackDeg = 0;
  let readoutEl = null;

  function render(deg, visualState) {
    const d = clamp(deg, ATTACK_MIN, ATTACK_MAX);
    const runner01 = mapDegTo01(d);
    lastAttackDeg = d;
    view.setState(visualState);
    view.setProgress01(runner01);
    view.setRunner01(runner01);
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
    const hostEl = resolveHost(rootEl, ui);
    if (!hostEl) return;
    readoutEl = document.getElementById("attackAngleReadout");
    view.mount(hostEl);
    mounted = true;
    locked = false;
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
  }

  function reset() {
    locked = false;
    render(0, "idle");
  }

  function destroy() {
    view.destroy();
    mounted = false;
    locked = false;
    readoutEl = null;
    lastAttackDeg = 0;
  }

  function getValue() {
    return { attackDeg: lastAttackDeg };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
