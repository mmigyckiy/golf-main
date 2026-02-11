(() => {
  // ===== Attack Angle Layer Debug (toggleable) =====
  const CSS_ID = "__aa_layer_debug_css__";

  function ensureCSS() {
    if (document.getElementById(CSS_ID)) return;

    const css = document.createElement("style");
    css.id = CSS_ID;
    css.textContent = `
/* ========== AA LAYER DEBUG ========== */
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack{ outline: 2px solid rgba(255,0,0,.70) !important; outline-offset: -2px; }
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__title{ outline: 2px solid rgba(255,140,0,.70) !important; }
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body{ outline: 2px solid rgba(0,255,0,.65) !important; }
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__footer{ outline: 2px solid rgba(0,160,255,.70) !important; }

body.__AA_DEBUG__ #attackAngle{ outline: 2px solid rgba(255,0,255,.70) !important; }
body.__AA_DEBUG__ #attackAnglePlane{ outline: 2px solid rgba(255,255,0,.70) !important; }
body.__AA_DEBUG__ #attackAnglePlane svg{ outline: 2px solid rgba(0,255,255,.70) !important; }

body.__AA_DEBUG__ #attackAngleRunner{ outline: 2px solid rgba(255,255,255,.75) !important; background: rgba(255,255,255,.10) !important; }
body.__AA_DEBUG__ #attackAngleReadout{ outline: 2px solid rgba(120,255,120,.75) !important; }
body.__AA_DEBUG__ #attackAngleValueLabel{ outline: 2px solid rgba(120,120,255,.75) !important; }

/* mark any SVG shapes inside Attack widget */
body.__AA_DEBUG__ #attackAnglePlane svg *{ outline: 1px dashed rgba(255,255,255,.20) !important; }

/* show overflow behavior clearly */
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack,
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body,
body.__AA_DEBUG__ #attackAngle,
body.__AA_DEBUG__ #attackAnglePlane{
  background-image: linear-gradient(rgba(255,255,255,.04), rgba(255,255,255,0)) !important;
}

/* little corner labels for quick reading */
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack::before{
  content:"attack card";
  position:absolute; left:10px; top:8px;
  font: 10px/1.2 system-ui, -apple-system;
  letter-spacing:.08em;
  color: rgba(255,0,0,.85);
  background: rgba(0,0,0,.35);
  padding: 2px 6px;
  border-radius: 6px;
  pointer-events:none;
  z-index: 9999;
}
body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body::before{
  content:"body";
  position:absolute; left:10px; top:10px;
  font: 10px/1.2 system-ui, -apple-system;
  color: rgba(0,255,0,.85);
  background: rgba(0,0,0,.35);
  padding: 2px 6px;
  border-radius: 6px;
  pointer-events:none;
  z-index: 9999;
}
body.__AA_DEBUG__ #attackAngle::before{
  content:"#attackAngle";
  position:absolute; right:10px; top:10px;
  font: 10px/1.2 system-ui, -apple-system;
  color: rgba(255,0,255,.9);
  background: rgba(0,0,0,.35);
  padding: 2px 6px;
  border-radius: 6px;
  pointer-events:none;
  z-index: 9999;
}
body.__AA_DEBUG__ #attackAnglePlane::before{
  content:"#attackAnglePlane";
  position:absolute; right:10px; top:28px;
  font: 10px/1.2 system-ui, -apple-system;
  color: rgba(255,255,0,.9);
  background: rgba(0,0,0,.35);
  padding: 2px 6px;
  border-radius: 6px;
  pointer-events:none;
  z-index: 9999;
}
`;
    document.head.appendChild(css);
  }

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left)
    };
  }

  window.__AA_DEBUG_ON__ = () => {
    ensureCSS();
    document.body.classList.add("__AA_DEBUG__");
    console.log("[AA_DEBUG] ON");
    console.log("[AA_DEBUG] key rects:", {
      card: rect(document.querySelector("#swingMetricsRow .swing-metric--attack")),
      body: rect(document.querySelector("#swingMetricsRow .swing-metric--attack .swing-metric__body")),
      attackAngle: rect(document.getElementById("attackAngle")),
      plane: rect(document.getElementById("attackAnglePlane")),
      svg: rect(document.querySelector("#attackAnglePlane svg")),
      runner: rect(document.getElementById("attackAngleRunner")),
      readout: rect(document.getElementById("attackAngleReadout"))
    });
  };

  window.__AA_DEBUG_OFF__ = () => {
    document.body.classList.remove("__AA_DEBUG__");
    const css = document.getElementById(CSS_ID);
    if (css) css.remove();
    console.log("[AA_DEBUG] OFF");
  };

  window.__AA_DEBUG_SVG_LIST__ = () => {
    const svg = document.querySelector("#attackAnglePlane svg");
    if (!svg) {
      console.warn("[AA_DEBUG] no svg found");
      return;
    }
    const nodes = [...svg.querySelectorAll("*")].map((n, i) => ({
      i,
      tag: n.tagName,
      id: n.id || "",
      cls: n.getAttribute("class") || "",
      fill: n.getAttribute("fill") || "",
      stroke: n.getAttribute("stroke") || "",
      d: (n.getAttribute("d") || "").slice(0, 80)
    }));
    console.table(nodes);
    return nodes;
  };

  console.log("Ready:");
  console.log("1) run __AA_DEBUG_ON__()");
  console.log("2) (optional) run __AA_DEBUG_SVG_LIST__() to list svg shapes");
  console.log("3) run __AA_DEBUG_OFF__() to remove");
})();
