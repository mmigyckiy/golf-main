// Helpers for Long Drive feature bundle

const TODAY_STORAGE_KEY = "golfcentral.longdrive.today";

export function computePerfectWindow(crashX){
  const start = Math.max(1.05, crashX - 0.18);
  const end = Math.max(start, crashX - 0.03);
  return { start, end };
}

export function formatPerfectWindow(win){
  if(!win) return "—";
  return `x${win.start.toFixed(2)} – x${win.end.toFixed(2)}`;
}

export function isWithinPerfectWindow(x, win){
  if(!win) return false;
  return x >= win.start && x <= win.end;
}

export function getTodayKey(){
  return new Date().toISOString().slice(0, 10);
}

export function loadLongestToday(){
  try{
    const raw = localStorage.getItem(TODAY_STORAGE_KEY);
    if(!raw) return { date: getTodayKey(), best: 0 };
    const parsed = JSON.parse(raw);
    if(parsed.date !== getTodayKey()) return { date: getTodayKey(), best: 0 };
    return { date: parsed.date, best: Number(parsed.best) || 0 };
  }catch(err){
    console.warn("[LD] longest today load failed", err);
    return { date: getTodayKey(), best: 0 };
  }
}

export function saveLongestToday(best){
  const payload = { date: getTodayKey(), best: Math.max(0, Math.round(best || 0)) };
  localStorage.setItem(TODAY_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function evaluateTarget(distance, target){
  const delta = Math.round(distance - target);
  if(Math.abs(delta) <= 5) return { label: "ON LINE", delta };
  if(delta < 0) return { label: `SHORT ${Math.abs(delta)} yd`, delta };
  return { label: `LONG ${delta} yd`, delta };
}

export function genCrashForRisk(risk){
  const profile = risk === "aggressive"
    ? { min: 1.05, max: 8.5, bias: 0.55 }
    : { min: 1.05, max: 6.5, bias: 0.85 };
  const r = Math.random();
  const val = profile.min + Math.pow(r, profile.bias) * (profile.max - profile.min);
  return Math.min(profile.max, Math.max(profile.min + 0.02, val));
}

export function getGrowthForRisk(risk){
  return risk === "aggressive" ? 0.74 : 0.56;
}

export function showSignatureOverlay({ type, distance, duration = 900 }){
  const overlay = document.getElementById("signatureOverlay");
  const eyebrow = document.getElementById("signatureEyebrow");
  const text = document.getElementById("signatureText");
  if(!overlay || !eyebrow || !text) return null;
  eyebrow.textContent = type;
  text.textContent = `${Math.max(0, Math.round(distance || 0))} yd`;
  overlay.classList.remove("gc-hidden");
  overlay.classList.add("gc-signature--visible");
  const timeout = setTimeout(() => {
    overlay.classList.remove("gc-signature--visible");
    overlay.classList.add("gc-hidden");
  }, duration);
  return timeout;
}
