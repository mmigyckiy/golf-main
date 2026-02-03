import { useSyncExternalStore } from "react";

const defaultSnapshot = {
  phase: "IDLE",
  locked: false,
  tempo01: 0,
  path01: 0.5,
  attackDeg: 0,
  sweetStart01: 0.41,
  sweetEnd01: 0.59
};

let state = { ...defaultSnapshot };
const listeners = new Set();

export function get() {
  return state;
}

export function set(next = {}) {
  const nextState = { ...state, ...(next || {}) };
  state = nextState;
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUIStore() {
  return useSyncExternalStore(subscribe, get, get);
}
