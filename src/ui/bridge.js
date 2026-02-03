import { set, get, subscribe } from "./store.js";

if (typeof window !== "undefined") {
  window.DrivixUI = { set, get, subscribe };
}
