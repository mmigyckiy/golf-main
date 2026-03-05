// ============================================================
// StateStore — centralised localStorage abstraction
// ============================================================
// All reads and writes to localStorage go through this module.
// Keys are defined once here so magic strings don't scatter.
// ============================================================

export const KEYS = {
  FLIGHTS:     "golfcentral.longdrive.v1",  // lastFlights array
  ANALYTICS:   "drivix.stats",              // recentDistances / recentSweet / recentRelease
  PLAYER_NAME: "drivix_member_name",        // primary player name key
  PLAYER_NAME_LEGACY: "drivix.playerName",  // legacy fallback (read-only migration)
  PROFILE:     "drivix.profileJson",
};

export const StateStore = {
  /** Read and JSON-parse a key. Returns `fallback` on missing or parse error. */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /** JSON-stringify and write a value. Silently warns on error. */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[StateStore] write failed", key, e);
    }
  },

  /** Remove a single key. */
  remove(key) {
    localStorage.removeItem(key);
  },

  /** Remove multiple keys at once. */
  removeAll(...keys) {
    keys.forEach(k => localStorage.removeItem(k));
  },
};
