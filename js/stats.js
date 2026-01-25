(function(global){
  const REFERENCE_YD = 280;
  const MAX_ATTEMPTS = 100;
  const WINDOW_N = 20;
  const KEY_NAME = "drivix.playerName";
  const KEY_PROFILE = "drivix.profileJson";
  const KEY_LEGACY = "drivix.stats";

  function normalizeAttempt(entry){
    const distance = Number(entry?.distance);
    const ts = Number(entry?.ts) || Date.now();
    return {
      distance: Number.isFinite(distance) ? distance : 0,
      crashed: !!entry?.crashed,
      ts
    };
  }

  function computeHandicap(expectedYd){
    const raw = Math.round((REFERENCE_YD - (expectedYd || 0)) / 10);
    return Math.max(0, Math.min(54, raw));
  }

  function computeMetrics(attempts = []){
    const list = Array.isArray(attempts) ? attempts.map(normalizeAttempt) : [];
    if(list.length === 0){
      return { pb: 0, best3avg: 0, handicapYd: 0 };
    }

    const distances = list.map(a => Number(a.distance) || 0);
    const pb = Math.max(0, ...distances);

    const recent = list.slice(-WINDOW_N).map(a => Number(a.distance) || 0).sort((a, b) => b - a);
    let pool = recent.slice(0, 3);
    if(list.length < 3){
      pool = distances;
    }
    const sum = pool.reduce((acc, val) => acc + val, 0);
    const avgRaw = pool.length ? sum / pool.length : 0;
    const best3avg = Math.round(avgRaw * 10) / 10;
    const handicapYd = list.length === 0 ? 0 : computeHandicap(best3avg);

    return { pb, best3avg, handicapYd };
  }

  function loadPlayerProfile(){
    let name = "";
    let attempts = [];
    try{
      const storedName = localStorage.getItem(KEY_NAME);
      if(storedName) name = String(storedName);
      const raw = localStorage.getItem(KEY_PROFILE) || localStorage.getItem(KEY_LEGACY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed?.attempts)){
          attempts = parsed.attempts.map(normalizeAttempt).slice(-MAX_ATTEMPTS);
        }
      }
    }catch(err){
      console.warn("[Drivix] stats load failed", err);
    }
    const metrics = computeMetrics(attempts);
    return { name, attempts, ...metrics };
  }

  function savePlayerProfile(profile){
    if(!profile) return;
    const name = profile.name || "";
    const attempts = Array.isArray(profile.attempts) ? profile.attempts.map(normalizeAttempt).slice(-MAX_ATTEMPTS) : [];
    try{
      localStorage.setItem(KEY_NAME, name);
      localStorage.setItem(KEY_PROFILE, JSON.stringify({ attempts }));
    }catch(err){
      console.warn("[Drivix] stats save failed", err);
    }
  }

  function addAttempt(distanceYd, crashedBool, ts = Date.now()){
    const baseProfile = loadPlayerProfile();
    const attempt = normalizeAttempt({ distance: distanceYd, crashed: crashedBool, ts });
    const attempts = [...(baseProfile.attempts || []), attempt].slice(-MAX_ATTEMPTS);
    const metrics = computeMetrics(attempts);
    const nextProfile = { name: baseProfile.name || "", attempts, ...metrics };
    savePlayerProfile(nextProfile);
    return nextProfile;
  }

  const api = {
    REFERENCE_YD,
    MAX_ATTEMPTS,
    WINDOW_N,
    loadPlayerProfile,
    savePlayerProfile,
    addAttempt,
    computeMetrics,
    computeHandicap
  };

  global.drivixStats = api;
})(typeof window !== "undefined" ? window : globalThis);
