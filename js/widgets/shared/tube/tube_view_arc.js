function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function svgPointToOffsetParent(svgEl, point, offsetParent) {
  if (!svgEl || !point || !offsetParent) return null;
  if (typeof svgEl.createSVGPoint !== "function") return null;
  const ctm = svgEl.getScreenCTM?.();
  if (!ctm) return null;
  const svgPoint = svgEl.createSVGPoint();
  svgPoint.x = point.x;
  svgPoint.y = point.y;
  const screenPoint = svgPoint.matrixTransform(ctm);
  if (!Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) return null;
  const parentRect = offsetParent.getBoundingClientRect();
  return {
    x: screenPoint.x - parentRect.left,
    y: screenPoint.y - parentRect.top
  };
}

function fallbackSvgPointToOffsetParent(svgEl, point, offsetParent) {
  if (!svgEl || !point || !offsetParent) return null;
  const vb = svgEl.viewBox?.baseVal;
  if (!vb || vb.width <= 0 || vb.height <= 0) return null;
  const svgRect = svgEl.getBoundingClientRect();
  if (!svgRect.width || !svgRect.height) return null;
  const parentRect = offsetParent.getBoundingClientRect();
  const sx = svgRect.width / vb.width;
  const sy = svgRect.height / vb.height;
  return {
    x: (point.x - vb.x) * sx + (svgRect.left - parentRect.left),
    y: (point.y - vb.y) * sy + (svgRect.top - parentRect.top)
  };
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
  let axisEl = null;
  let zeroScaleLabelEl = null;
  let mounted = false;
  let progress01 = 0;
  let runner01 = 0.5;
  let currentValueDeg = 0;
  let armedOnce = false;
  let visualState = "idle";
  let onResize = null;
  let resizeRafId = 0;
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

  function updateAttackRunnerPosition(valueDeg) {
    if (!mounted || !pathInnerEl || !runnerEl || !svgEl || !stageEl) return;
    const pathEl =
      svgEl.querySelector(".tubeArc__inner") ||
      svgEl.querySelector(".tubeArc__outer") ||
      pathInnerEl;
    if (!pathEl) return;

    const normalizedDeg = Number.isFinite(valueDeg) ? clamp(valueDeg, -6, 6) : null;
    const t = Number.isFinite(normalizedDeg)
      ? clamp01((6 - normalizedDeg) / 12)
      : clamp01(progress01);

    const total = pathEl.getTotalLength?.();
    if (!Number.isFinite(total) || total <= 0) return;

    const point = pathEl.getPointAtLength(total * t);
    const runnerParent = runnerEl.offsetParent || stageEl || runnerEl.parentElement;
    if (!runnerParent) return;

    const targetPoint =
      svgPointToOffsetParent(svgEl, point, runnerParent) ||
      fallbackSvgPointToOffsetParent(svgEl, point, runnerParent);
    if (!targetPoint) return;

    runnerEl.style.left = `${targetPoint.x}px`;
    runnerEl.style.top = `${targetPoint.y}px`;

    const parentRect = runnerParent.getBoundingClientRect();
    const resolvedDeg = Number.isFinite(normalizedDeg) ? normalizedDeg : clamp(6 - (t * 12), -6, 6);
    currentValueDeg = resolvedDeg;
    runner01 = t;
    debugSnapshot = {
      stageW: parentRect.width,
      stageH: parentRect.height,
      left: targetPoint.x,
      top: targetPoint.y,
      centerX: targetPoint.x,
      centerY: targetPoint.y,
      runner01: t
    };
    mountEl?.classList.toggle("is-perfect", Math.abs(resolvedDeg) <= 0.25);
  }

  function findZeroScaleLabel() {
    if (!viewEl) return null;
    const labels = Array.from(viewEl.querySelectorAll(".tubeArc__scaleLabel"));
    return labels.find((el) => (el.textContent || "").trim() === "0") || labels[1] || null;
  }

  function ensureCenterAxis() {
    if (!stageEl) return null;
    let axis = stageEl.querySelector("#attackAxisCenter");
    if (!axis) {
      axis = document.createElement("div");
      axis.id = "attackAxisCenter";
      axis.setAttribute("aria-hidden", "true");
      axis.style.pointerEvents = "none";
      if (runnerEl && runnerEl.parentElement === stageEl) {
        stageEl.insertBefore(axis, runnerEl);
      } else {
        stageEl.appendChild(axis);
      }
    }
    axisEl = axis;
    return axisEl;
  }

  function syncAxisColor() {
    if (!axisEl || !viewEl) return;
    const tickEl = viewEl.querySelector(".tubeArc__tick");
    const tickBg = tickEl ? window.getComputedStyle(tickEl).backgroundColor : "";
    if (tickBg) axisEl.style.setProperty("--attack-axis-color", tickBg);
  }

  function updateCenterAxisGeometry() {
    const axis = ensureCenterAxis();
    const bodyEl = stageEl;
    const arcSvg = bodyEl?.querySelector?.(".tubeArc__svg");
    zeroScaleLabelEl = zeroScaleLabelEl?.isConnected ? zeroScaleLabelEl : findZeroScaleLabel();
    const zeroEl = zeroScaleLabelEl;
    if (!axis || !bodyEl || !arcSvg || !zeroEl) {
      if (axis) axis.style.display = "none";
      return;
    }

    const bodyRect = bodyEl.getBoundingClientRect();
    const arcRect = arcSvg.getBoundingClientRect();
    const zeroRect = zeroEl.getBoundingClientRect();
    const topPx = (arcRect.bottom - bodyRect.top) + 10;
    const endPx = (zeroRect.top - bodyRect.top) - 10;
    const heightPx = Math.max(0, endPx - topPx);

    axis.style.display = "";
    axis.style.top = `${Math.max(0, topPx)}px`;
    axis.style.height = `${heightPx}px`;
    syncAxisColor();
  }

  function render() {
    if (!mounted) return;
    updateAttackRunnerPosition(currentValueDeg);
    updateCenterAxisGeometry();
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
    axisEl = null;
    zeroScaleLabelEl = null;

    mounted = true;
    armedOnce = false;
    visualState = "idle";
    currentValueDeg = 0;
    mountEl.classList.remove("is-perfect");
    onResize = () => {
      if (resizeRafId) return;
      resizeRafId = window.requestAnimationFrame(() => {
        resizeRafId = 0;
        render();
      });
    };
    window.addEventListener("resize", onResize);
    render();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        render();
      });
    });
  }

  function setProgress01(v01) {
    progress01 = clamp01(v01);
    currentValueDeg = clamp(6 - (progress01 * 12), -6, 6);
    runner01 = progress01;
    render();
  }

  function setRunner01(v01) {
    runner01 = Number.isFinite(v01) ? clamp01(v01) : 0.5;
    progress01 = runner01;
    currentValueDeg = clamp(6 - (runner01 * 12), -6, 6);
    render();
  }

  function setValueDeg(valueDeg) {
    currentValueDeg = Number.isFinite(valueDeg) ? clamp(valueDeg, -6, 6) : 0;
    runner01 = clamp01((6 - currentValueDeg) / 12);
    progress01 = runner01;
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
    axisEl = null;
    zeroScaleLabelEl = null;
    mounted = false;
    armedOnce = false;
    visualState = "idle";
    currentValueDeg = 0;
    resizeRafId = 0;
    if (onResize) {
      window.removeEventListener("resize", onResize);
      onResize = null;
    }
  }

  return { mount, setProgress01, setRunner01, setValueDeg, setState, getDebugSnapshot, destroy };
}
