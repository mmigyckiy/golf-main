import { createTempoViewWedge } from "./tempo_view_wedge.js";

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

/** Map tempo 0–1 to a display word + CSS tier name */
function tempoLabel(v) {
  if (v <= 0.005) return { word: "",       tier: "" };
  if (v <  0.30)  return { word: "WEAK",   tier: "weak" };
  if (v <  0.60)  return { word: "GOOD",   tier: "good" };
  if (v <  0.80)  return { word: "STRONG", tier: "strong" };
                  return { word: "MAX",    tier: "max" };
}

function tempoStateFromPhase({ phase, holdActive, locked }) {
  if (locked) return "locked";
  if (holdActive) return "hold";
  if (phase === "IDLE" || phase === "END") return "idle";
  return "active";
}

export function createTempoWidget() {
  const name = "tempo";
  const view = createTempoViewWedge();

  let mounted = false;
  let locked = false;
  let lastTempo01 = 0;
  let valueEl = null;
  let pctEl = null;
  let hostEl = null;

  function render(tempo01, visualState) {
    const v = clamp01(tempo01);
    lastTempo01 = v;
    view.setProgress01(v);
    view.setRunner01(v);
    view.setState(visualState);

    const pct = `${Math.round(v * 100)}%`;
    if (valueEl) valueEl.textContent = pct;
    if (pctEl) {
      const { word, tier } = tempoLabel(v);
      pctEl.textContent = word;
      pctEl.dataset.power = tier;
    }
  }

  function resolveHost(rootEl, ui) {
    const mount =
      rootEl ||
      ui?.tempo?.control ||
      ui?.tempo?.mount ||
      document.getElementById("tempoMount");
    if (!mount) return null;
    if (mount.id === "swingTempoControl") return mount;
    let control = mount.querySelector("#swingTempoControl");
    if (!control) {
      control = document.createElement("div");
      control.id = "swingTempoControl";
      control.className = "metricWidgetHost";
      mount.appendChild(control);
    }
    return control;
  }

  function mount({ rootEl, ui } = {}) {
    if (mounted) return;
    hostEl = resolveHost(rootEl, ui);
    if (!hostEl) return;
    valueEl = document.getElementById("tempoValueLabel");
    pctEl = document.getElementById("swingTempoPct");
    view.mount(hostEl);
    mounted = true;
    locked = false;
    render(0, "idle");
  }

  function update({ phase = "IDLE", state, snapshot } = {}) {
    if (!mounted) mount({ ui: state?.uiRefs });
    if (!mounted) return;

    const shotTempo = snapshot?.tempo01;
    const stateTempo = state?.shot?.tempo01;
    const tempo01 = Number.isFinite(shotTempo) ? shotTempo : stateTempo;

    const holdActive =
      !locked &&
      phase === "ARMING" &&
      (state?.tempo?.holding ?? state?.hand?.holding ?? true);
    const visualState = tempoStateFromPhase({ phase, holdActive, locked: locked || !!state?.shot?.locked });

    if (locked) return;
    render(tempo01, visualState);
  }

  function lock({ snapshot, state } = {}) {
    locked = true;
    const tempo01 = Number.isFinite(snapshot?.tempo01) ? snapshot.tempo01 : state?.shot?.tempo01;
    render(tempo01, "locked");
  }

  function reset() {
    locked = false;
    render(0, "idle");
  }

  function destroy() {
    view.destroy();
    mounted = false;
    locked = false;
    hostEl = null;
    valueEl = null;
    pctEl = null;
    lastTempo01 = 0;
  }

  function getValue() {
    return { tempo01: lastTempo01 };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
