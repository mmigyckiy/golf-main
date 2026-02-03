import {
  initAttackAnglePlane,
  updateAttackAnglePlane,
  lockAttackAnglePlane,
  resetAttackAnglePlane,
  getAttackAngleValue,
  renderAttackAnglePlane
} from "../../attack_angle_plane.js";

export function createAttackWidget() {
  const name = "attack";
  let mounted = false;
  let getState = null;

  function mount({ getState: getStateFn } = {}) {
    if (mounted) return;
    getState = getStateFn || null;
    initAttackAnglePlane(() => (typeof getState === "function" ? getState() : null), {
      isArming: (s) => s?.phase === "ARMING"
    });
    renderAttackAnglePlane();
    mounted = true;
  }

  function update({ ts, dt, phase }) {
    if (!mounted) mount();
    if (phase !== "ARMING") return;
    const state = typeof getState === "function" ? getState() : null;

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

  function destroy() {
    mounted = false;
  }

  function getValue() {
    return { attackDeg: getAttackAngleValue() };
  }

  return { name, mount, update, lock, reset, destroy, getValue };
}
