(function () {
  const PATCH_TAG = "[ATTACK_PATCH]";
  const GUIDE_ID = "__attackCenterGuide";

  function findAttackRoot() {
    return document.querySelector('#swingMetricsRow [data-widget="attack"]');
  }

  function findStage(root) {
    return (
      root.querySelector(".tubeArc__stage") ||
      root.querySelector(".metricCard__body") ||
      root
    );
  }

  function findArcSvg(root) {
    return root.querySelector(".tubeArc__svg");
  }

  function findZeroLabel(root, stageRect) {
    // Search for "0" labels only inside the attack widget.
    const nodes = Array.from(root.querySelectorAll("*"))
      .filter((el) => el.childElementCount === 0)
      .filter((el) => (el.textContent || "").trim() === "0");

    if (!nodes.length) return null;

    const stageCenterX = stageRect.left + stageRect.width / 2;

    // Pick the "0" nearest to the stage center on the X axis.
    let best = null;
    let bestScore = Infinity;

    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const score = Math.abs((r.left + r.width / 2) - stageCenterX);
      if (score < bestScore) {
        bestScore = score;
        best = { el, rect: r };
      }
    }
    return best;
  }

  function ensureStagePositioned(stage) {
    const cs = getComputedStyle(stage);
    if (cs.position === "static") {
      // Does not change surrounding layout; only anchors absolute overlays.
      stage.style.position = "relative";
    }
  }

  function ensureGuide(stage) {
    let guide = stage.querySelector(`#${GUIDE_ID}`);
    if (!guide) {
      guide = document.createElement("div");
      guide.id = GUIDE_ID;
      guide.style.position = "absolute";
      guide.style.left = "50%";
      guide.style.transform = "translateX(-50%)";
      guide.style.width = "3px";
      guide.style.pointerEvents = "none";
      guide.style.zIndex = "3";
      // Scale-like gray-beige, dashed with repeating gradient.
      guide.style.background =
        "repeating-linear-gradient(to bottom, rgba(160,160,160,.55) 0 14px, transparent 14px 30px)";
      stage.appendChild(guide);
    }
    return guide;
  }

  function updateCenterGuide() {
    const root = findAttackRoot();
    if (!root) return;

    const stage = findStage(root);
    const svg = findArcSvg(root);
    if (!stage || !svg) return;

    const stageRect = stage.getBoundingClientRect();
    const arcRect = svg.getBoundingClientRect();

    const zero = findZeroLabel(root, stageRect);
    if (!zero) return;

    ensureStagePositioned(stage);
    const guide = ensureGuide(stage);

    // Start below the arc to avoid intersection.
    const top = (arcRect.bottom - stageRect.top) + 10;
    // End a bit above the "0" label.
    const bottom = (zero.rect.top - stageRect.top) - 8;
    const h = Math.max(0, bottom - top);

    guide.style.top = `${top}px`;
    guide.style.height = `${h}px`;
  }

  // Public hook for manual calls.
  window.applyAttackArcPatch = function applyAttackArcPatch() {
    try {
      updateCenterGuide();
      // One more update on next frame (DOM may finish painting later).
      requestAnimationFrame(updateCenterGuide);
      // And another for late layout/Pixi timing.
      requestAnimationFrame(() => requestAnimationFrame(updateCenterGuide));
      console.log(PATCH_TAG, "applyAttackArcPatch OK");
    } catch (e) {
      console.warn(PATCH_TAG, "applyAttackArcPatch failed:", e);
    }
  };

  function boot() {
    window.applyAttackArcPatch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  let raf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => window.applyAttackArcPatch());
  });

  // Keep a single observer to avoid duplicates.
  if (!window.__attackCenterGuideObserver) {
    const obs = new MutationObserver(() => {
      window.applyAttackArcPatch();
    });
    window.__attackCenterGuideObserver = obs;

    const host = document.querySelector("#swingMetricsRow") || document.body;
    obs.observe(host, { subtree: true, childList: true, attributes: true });
  }
})();
