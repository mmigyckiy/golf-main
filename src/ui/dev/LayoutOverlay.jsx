import React, { useEffect, useMemo, useState } from "react";

const BLOCKS = [
  { label: "APP SHELL", selector: ".appShell" },
  { label: "APP MAIN", selector: ".appMain" },
  { label: "MAIN LAYOUT", selector: ".gc-layout" },
  { label: "TOPBAR", selector: "header .gc-topbar, .gc-topbar" },
  { label: "CANVAS / FIELD", selector: "#flightCanvas, canvas" },
  { label: "CONTROLS PANEL", selector: ".gc-controls" },
  { label: "SWING DOCK", selector: ".appDock" },
  { label: "WIDGETS ROOT (React)", selector: "#uiRoot" },
  { label: "SWING METRICS ROW", selector: "#swingMetricsRow, .swing-metrics-row" },
  { label: "SIDE PANEL", selector: "aside.gc-sidepanel" },
];

export function LayoutOverlay() {
  const [boxes, setBoxes] = useState([]);

  const enabled = useMemo(
    () => new URLSearchParams(window.location.search).get("layout") === "1",
    []
  );

  useEffect(() => {
    if (!enabled) {
      setBoxes([]);
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const next = [];
      for (const { label, selector } of BLOCKS) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        next.push({ label, rect });
      }
      setBoxes(next);
    };

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const ro = new ResizeObserver(schedule);
    BLOCKS.forEach(({ selector }) => {
      const el = document.querySelector(selector);
      if (el) ro.observe(el);
    });

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (rafId) window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="layoutOverlay" aria-hidden="true">
      {boxes.map(({ label, rect }) => (
        <div
          key={label}
          className="layoutOverlay__box"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          <div className="layoutOverlay__label">
            {label} • {Math.round(rect.width)}×{Math.round(rect.height)}
          </div>
        </div>
      ))}
    </div>
  );
}
