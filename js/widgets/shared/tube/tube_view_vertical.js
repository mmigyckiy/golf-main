function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function mapRunner01(t) {
  const c = clamp01(t);
  if (c <= 0.85) return c;
  const u = (c - 0.85) / 0.15;
  return 0.85 + 0.15 * easeOutQuad(u);
}

export function createTubeViewVertical(_opts = {}) {
  let mountEl = null;
  let viewEl = null;
  let tubeEl = null;
  let fillEl = null;
  let runnerEl = null;
  let mounted = false;
  let progress01 = 0;
  let runner01 = 0;

  function setState(state) {
    if (!viewEl) return;
    viewEl.classList.remove("is-idle", "is-active", "is-hold", "is-locked");
    const key = String(state || "idle").toLowerCase();
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

  function render() {
    if (!mounted || !tubeEl || !fillEl || !runnerEl) return;

    const p = clamp01(progress01);
    const r = mapRunner01(runner01);

    const tubeH = tubeEl.clientHeight || 180;
    const runnerH = runnerEl.offsetHeight || 14;
    const inset = Math.max(2, Math.round(runnerH * 0.25));
    const minBottom = inset;
    const maxBottom = Math.max(minBottom, tubeH - runnerH - inset);
    const yFinal = minBottom + (maxBottom - minBottom) * r;
    tubeEl.style.setProperty("--runnerY", `${yFinal.toFixed(2)}px`);

    const fillPx = Math.max(8, Math.min(tubeH, tubeH * p));
    fillEl.style.height = `${((fillPx / tubeH) * 100).toFixed(2)}%`;
  }

  function mount(rootEl) {
    if (!rootEl || mounted) return;
    mountEl = rootEl;
    mountEl.innerHTML = "";
    mountEl.classList.add("metricWidgetHost", "metricWidgetHost--tempo");
    mountEl.setAttribute("tabindex", "0");
    mountEl.setAttribute("role", "button");
    mountEl.setAttribute("aria-label", "Swing tempo");
    mountEl.id = mountEl.id || "swingTempoControl";

    viewEl = document.createElement("div");
    viewEl.className = "tubeView tubeView--vertical is-idle";
    viewEl.innerHTML = `
      <div class="tubeV">
        <div class="tubeV__tube">
          <div class="tubeV__fill"></div>
          <div class="tubeV__runner"></div>
        </div>
        <div class="tubeV__scale" aria-hidden="true">
          <span class="tubeV__label">100</span>
          <span class="tubeV__tick tubeV__tick--major"></span>
          <span class="tubeV__label">50</span>
          <span class="tubeV__tick"></span>
          <span class="tubeV__label">0</span>
        </div>
      </div>
    `;
    mountEl.appendChild(viewEl);

    tubeEl = viewEl.querySelector(".tubeV__tube");
    fillEl = viewEl.querySelector(".tubeV__fill");
    runnerEl = viewEl.querySelector(".tubeV__runner");

    mounted = true;
    render();
  }

  function setProgress01(v01) {
    progress01 = clamp01(v01);
    render();
  }

  function setRunner01(v01) {
    runner01 = clamp01(v01);
    render();
  }

  function destroy() {
    if (!mountEl) return;
    mountEl.innerHTML = "";
    mountEl.classList.remove("metricWidgetHost--tempo");
    mounted = false;
    mountEl = null;
    viewEl = null;
    tubeEl = null;
    fillEl = null;
    runnerEl = null;
  }

  return { mount, setProgress01, setRunner01, setState, destroy };
}
