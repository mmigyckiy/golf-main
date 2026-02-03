import {
  initAttackAnglePlane,
  updateAttackAnglePlane,
  lockAttackAnglePlane,
  resetAttackAnglePlane,
  getAttackAngleValue,
  renderAttackAnglePlane
} from "../../attack_angle_plane.js";

export function createAttackWidget({ getState }) {
  const name = "attack";
  let mounted = false;

  function mount() {
    if (mounted) return;
    initAttackAnglePlane(() => getState(), { isArming: (s) => s?.phase === "ARMING" });
    renderAttackAnglePlane();
    mounted = true;
  }

  function update({ ts, dt, phase, state }) {
    if (!mounted) mount();
    if (phase !== "ARMING") return;

    if (state?.shot && Number.isFinite(state.shot.attackDeg)) {
      state.attackAngle = state.attackAngle || {};
      state.attackAngle.valueDeg = state.shot.attackDeg;
      state.attackAngle.active = true;
      state.attackAngle.locked = false;
      renderAttackAnglePlane();
    } else {
      updateAttackAnglePlane(ts, dt);
    }
  }

  function lock() {
    lockAttackAnglePlane();
  }

  function reset() {
    resetAttackAnglePlane();
  }

  function getValue() {
    return { attackDeg: getAttackAngleValue() };
  }

  return { name, mount, update, lock, reset, getValue };
}
