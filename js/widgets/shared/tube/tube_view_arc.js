function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutQuad(t) {
  const c = clamp01(t);
  return 1 - (1 - c) * (1 - c);
}

export function createTubeViewArc({
  arcPathD = "M18 70 A44 44 0 0 1 102 70",
  viewBox = "0 0 120 90"
} = {}) {
  let mountEl = null;
  let viewEl = null;
  let stageEl = null;
  let svgEl = null;
  let pathInnerEl = null;
  let runnerEl = null;
  let mounted = false;
  let progress01 = 0;
  let runner01 = 0.5;
  let armedOnce = false;
  let visualState = "idle";
  let smoothX = null;
  let smoothY = null;
  let onResize = null;
  let debugSnapshot = null;

  function setState(state) {
    if (!viewEl) return;
    viewEl.classList.remove("is-idle", "is-active", "is-hold", "is-locked");
    const key = String(state || "idle").toLowerCase();
    visualState = key;
    if (!armedOnce && key !== "idle" && key !== "ready") {
      armedOnce = true;
    }
    switch (key) {
      case "hold":
        viewEl.classList.add("is-hold");
        break;
      case "locked":
        viewEl.classList.add("is-locked");
        break;
      case "active":
        viewEl.classList.add("is-active");
        break;
      default:
        viewEl.classList.add("is-idle");
        break;
    }
  }

  function positionRunner() {
    if (!mounted || !pathInnerEl || !runnerEl || !svgEl || !stageEl) return;
    const total = pathInnerEl.getTotalLength?.();
    if (!Number.isFinite(total) || total <= 0) return;
    const isIdle = visualState === "idle" || visualState === "ready" || !visualState;
    if (!armedOnce && !isIdle) armedOnce = true;
    const normalized01 = Number.isFinite(runner01) ? clamp01(runner01) : 0.5;
    const effective01 = (!armedOnce && isIdle) ? 0.5 : normalized01;
    const point = pathInnerEl.getPointAtLength(total * effective01);
    const vb = svgEl.viewBox?.baseVal;
    if (!vb || vb.width <= 0 || vb.height <= 0) return;

    const svgRect = svgEl.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height || !stageRect.width || !stageRect.height) return;

    const sx = svgRect.width / vb.width;
    const sy = svgRect.height / vb.height;
    const targetX = (point.x - vb.x) * sx + (svgRect.left - stageRect.left);
    const targetY = (point.y - vb.y) * sy + (svgRect.top - stageRect.top);

    const attackDeg = effective01 * 12 - 6;
    const absA = Math.abs(attackDeg);
    const tEnd = clamp01(absA / 6);
    const k = lerp(0.20, 0.12, easeOutQuad(tEnd));

    if (!armedOnce) {
      smoothX = targetX;
      smoothY = targetY;
    } else if (smoothX == null || smoothY == null) {
      smoothX = targetX;
      smoothY = targetY;
    } else {
      smoothX = lerp(smoothX, targetX, k);
      smoothY = lerp(smoothY, targetY, k);
    }

    const runnerRect = runnerEl.getBoundingClientRect();
    const runnerSize = Number.isFinite(runnerRect.width) && runnerRect.width > 0
      ? runnerRect.width
      : 22;
    const half = runnerSize / 2;
    const left = clamp(smoothX - half, -half, stageRect.width - half);
    const top = clamp(smoothY - half, -half, stageRect.height - half);

    runnerEl.style.left = `${left.toFixed(2)}px`;
    runnerEl.style.top = `${top.toFixed(2)}px`;
    runnerEl.style.setProperty("transform", visualState === "hold" ? "scale(1.05)" : "none", "important");
    debugSnapshot = {
      stageW: stageRect.width,
      stageH: stageRect.height,
      left,
      top,
      centerX: smoothX,
      centerY: smoothY,
      runnerSize,
      runner01: effective01
    };
    mountEl?.classList.toggle("is-perfect", absA <= 0.25);
  }

  function render() {
    if (!mounted) return;
    positionRunner();
    if (viewEl) viewEl.style.setProperty("--arcProgress", `${clamp01(progress01)}`);
  }

  function mount(rootEl) {
    if (!rootEl || mounted) return;
    mountEl = rootEl;
    mountEl.innerHTML = "";
    mountEl.classList.add("metricWidgetHost", "metricWidgetHost--attack");

    viewEl = document.createElement("div");
    viewEl.className = "tubeView tubeView--arc is-idle";
    viewEl.innerHTML = `
      <div class="tubeArc">
        <div class="tubeArc__stage">
          <svg class="tubeArc__svg" viewBox="${viewBox}" aria-hidden="true">
            <path class="tubeArc__outer aa-arcTrack aa-arcTrack--outer" d="${arcPathD}" fill="none"></path>
            <path class="tubeArc__inner aa-arcTrack aa-arcTrack--inner" data-aa-arc="1" d="${arcPathD}" fill="none"></path>
          </svg>
          <div class="tubeArc__runner aa-runner" id="attackAngleRunner" aria-hidden="true"></div>
        </div>
        <div class="tubeArc__scale" aria-hidden="true">
          <span class="tubeArc__scaleLabel">+6</span>
          <span class="tubeArc__tick tubeArc__tick--major"></span>
          <span class="tubeArc__tick"></span>
          <span class="tubeArc__scaleLabel">0</span>
          <span class="tubeArc__tick"></span>
          <span class="tubeArc__tick tubeArc__tick--major"></span>
          <span class="tubeArc__scaleLabel">-6</span>
        </div>
      </div>
    `;
    mountEl.appendChild(viewEl);

    stageEl = viewEl.querySelector(".tubeArc__stage");
    svgEl = viewEl.querySelector(".tubeArc__svg");
    pathInnerEl = viewEl.querySelector('[data-aa-arc="1"]');
    runnerEl = viewEl.querySelector("#attackAngleRunner");

    mounted = true;
    armedOnce = false;
    visualState = "idle";
    smoothX = null;
    smoothY = null;
    mountEl.classList.remove("is-perfect");
    onResize = () => render();
    window.addEventListener("resize", onResize);
    render();
  }

  function setProgress01(v01) {
    progress01 = clamp01(v01);
    render();
  }

  function setRunner01(v01) {
    runner01 = Number.isFinite(v01) ? clamp01(v01) : 0.5;
    render();
  }

  function getDebugSnapshot() {
    return debugSnapshot ? { ...debugSnapshot } : null;
  }

  function destroy() {
    if (!mountEl) return;
    mountEl.innerHTML = "";
    mountEl.classList.remove("is-perfect");
    mountEl.classList.remove("metricWidgetHost--attack");
    mountEl = null;
    viewEl = null;
    stageEl = null;
    svgEl = null;
    pathInnerEl = null;
    runnerEl = null;
    mounted = false;
    armedOnce = false;
    visualState = "idle";
    smoothX = null;
    smoothY = null;
    if (onResize) {
      window.removeEventListener("resize", onResize);
      onResize = null;
    }
  }

  return { mount, setProgress01, setRunner01, setState, getDebugSnapshot, destroy };
}
