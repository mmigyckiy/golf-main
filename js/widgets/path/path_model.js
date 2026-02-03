export function createPathModel() {
  let head01 = 0.5;
  let intensity01 = 0.5;
  let locked = false;

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function update({ headPos01, intensity }) {
    if (locked) return;
    if (Number.isFinite(headPos01)) head01 = clamp01(headPos01);
    if (Number.isFinite(intensity)) intensity01 = clamp01(intensity);
  }

  function lock() {
    locked = true;
  }

  function reset() {
    locked = false;
    head01 = 0.5;
    intensity01 = 0.5;
  }

  function getValue() {
    return { path01: head01, intensity01, locked };
  }

  return { update, lock, reset, getValue };
}
