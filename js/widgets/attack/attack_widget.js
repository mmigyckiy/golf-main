import { createTubeViewArc } from "../shared/tube/tube_view_arc.js";

const ATTACK_MIN = -6;
const ATTACK_MAX = 6;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function mapDegTo01(deg) {
  return (clamp(deg, ATTACK_MIN, ATTACK_MAX) - ATTACK_MIN) / (ATTACK_MAX - ATTACK_MIN);
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
    arcPathD: "M10 70 A50 50 0 0 1 110 70",
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
    view.setProgress01(runner01);
    view.setRunner01(runner01);
    view.setState(visualState);
    if (readoutEl) readoutEl.textContent = fmtAttackDeg(d);
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
    render(attackDeg, visualState);
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
