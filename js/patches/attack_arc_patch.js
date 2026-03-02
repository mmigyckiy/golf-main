/*
  WHY: Attack arc svg was being constrained/scaled down; this patch removes
  transform scaling and widens the path geometry.
*/
const DEBUG = false;

function debugLog(...args) {
  if (!DEBUG) return;
  console.log("[attack_arc_patch]", ...args);
}

function applyAttackArcPatch() {
  const attackWidget = document.querySelector('#swingMetricsRow [data-widget="attack"]');
  if (!attackWidget) return false;

  const svg = attackWidget.querySelector(".tubeArc__svg");
  if (!svg) return false;

  const stage = attackWidget.querySelector(".tubeArc__stage") || svg.parentElement;
  if (stage) {
    stage.style.setProperty("width", "100%", "important");
    stage.style.setProperty("max-width", "none", "important");
  }

  svg.style.setProperty("transform", "none", "important");
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", "auto", "important");
  svg.style.setProperty("display", "block", "important");

  const widenedArcD = "M4 70 A56 56 0 0 1 116 70";
  const outerPath = svg.querySelector(".tubeArc__outer");
  const innerPath = svg.querySelector(".tubeArc__inner");

  if (outerPath) outerPath.setAttribute("d", widenedArcD);
  if (innerPath) innerPath.setAttribute("d", widenedArcD);

  return true;
}

function bootstrapAttackArcPatch() {
  let attempts = 0;
  const maxAttempts = 30;
  const retryMs = 100;

  const retryId = window.setInterval(() => {
    attempts += 1;
    if (applyAttackArcPatch() || attempts >= maxAttempts) {
      window.clearInterval(retryId);
    }
  }, retryMs);

  const metricsRow = document.getElementById("swingMetricsRow");
  if (!metricsRow) return;

  let rafId = 0;
  const observer = new MutationObserver(() => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      applyAttackArcPatch();
    });
  });

  observer.observe(metricsRow, {
    childList: true,
    subtree: true
  });

  let resizeRafId = 0;
  window.addEventListener("resize", () => {
    if (resizeRafId) return;
    resizeRafId = window.requestAnimationFrame(() => {
      resizeRafId = 0;
      applyAttackArcPatch();
    });
  }, { passive: true });

  applyAttackArcPatch();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapAttackArcPatch, { once: true });
} else {
  bootstrapAttackArcPatch();
}

window.applyAttackArcPatch = applyAttackArcPatch;
