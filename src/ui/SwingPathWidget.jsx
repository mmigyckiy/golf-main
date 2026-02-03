import React, { useEffect, useRef, useState } from "react";

export function SwingPathWidget({ path01 = 0.5, phase, locked, sweetStart01, sweetEnd01, intensity01 }) {
  const hostRef = useRef(null);
  const initialized = useRef(false);
  const [usePixi, setUsePixi] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    const host = hostRef.current;
    if (host && window.SwingPathPixi?.init) {
      const ok = window.SwingPathPixi.init({ containerEl: host });
      setUsePixi(!!ok);
      initialized.current = true;
      return;
    }
    setUsePixi(false);
  }, []);

  useEffect(() => {
    if (!window.SwingPathPixi?.update) return;
    window.SwingPathPixi.update({
      headPos01: path01,
      phase,
      locked,
      sweetStart01,
      sweetEnd01,
      intensity01,
      dtMs: 16
    });
  }, [path01, phase, locked, sweetStart01, sweetEnd01, intensity01]);

  return (
    <div className="swing-metric swing-metric--path">
      <div className="swing-metric__title">SWING PATH</div>
      <div className="swing-metric__body">
        <div className="pixi-widget-canvas" id="pathPixiHost" ref={hostRef} aria-hidden="true"></div>
        {!usePixi && (
          <div className="alignment-ring" aria-label="Alignment ring">
            <svg className="alignment-ring__svg" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="alignmentRingGradientReact" x1="0" y1="10" x2="0" y2="110" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.10)"></stop>
                  <stop offset="100%" stopColor="rgba(0,0,0,0.30)"></stop>
                </linearGradient>
              </defs>
              <path className="alignment-ring__base" d=""></path>
              <path className="alignment-ring__sweet" d=""></path>
              <circle className="alignment-ring__ball" cx="60" cy="102" r="3"></circle>
              <circle className="alignment-ring__runner" cx="60" cy="12" r="4.2"></circle>
            </svg>
            <div className="align-target-tick" aria-hidden="true"></div>
          </div>
        )}
      </div>
      <div className="swing-metric__footer">
        <div className="swing-metric__value swing-metric__value--muted"> </div>
        <div className="swing-metric__hint"> </div>
      </div>
    </div>
  );
}
