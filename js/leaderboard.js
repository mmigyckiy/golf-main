// Dynamic leaderboard: blends static virtual opponents with the real player's best today

const VIRTUAL_PLAYERS = [
  { name: "E. Morgan",  yd: 318 },
  { name: "A. Sinclair", yd: 304 },
  { name: "J. Bennett", yd: 298 },
  { name: "K. Wallace", yd: 289 },
  { name: "S. Hughes",  yd: 281 }
];

const TODAY_STORAGE_KEY = "golfcentral.longdrive.today";
const PROFILE_STORAGE_KEY = "drivix.profile";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadPlayerBestToday() {
  try {
    const raw = localStorage.getItem(TODAY_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return 0;
    return Number(parsed.best) || 0;
  } catch {
    return 0;
  }
}

function loadPlayerName() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.name || null;
  } catch {
    return null;
  }
}

function buildRows(playerName, playerBest) {
  const entries = VIRTUAL_PLAYERS.map(p => ({ name: p.name, yd: p.yd, isPlayer: false }));

  if (playerBest > 0 && playerName) {
    entries.push({ name: playerName, yd: playerBest, isPlayer: true });
  }

  entries.sort((a, b) => b.yd - a.yd);
  return entries.slice(0, 5);
}

function renderLeaderboard() {
  const ol = document.querySelector(".gc-leaderboard");
  if (!ol) return;

  const playerBest = loadPlayerBestToday();
  const playerName = loadPlayerName() || "You";
  const rows = buildRows(playerName, playerBest);

  ol.innerHTML = rows.map(entry => {
    const cls = entry.isPlayer ? ' class="you"' : "";
    return `<li${cls}><span class="name">${entry.name}</span><span class="val">${entry.yd} yd</span></li>`;
  }).join("");

  // Update "You" inline readout at bottom
  const youInline = document.getElementById("youBestInline");
  if (youInline) {
    youInline.textContent = playerBest > 0 ? `${playerBest} yd` : "—";
  }
}

// Re-render whenever a new best is set
export function updateLeaderboard() {
  renderLeaderboard();
}

// Init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderLeaderboard);
} else {
  renderLeaderboard();
}
