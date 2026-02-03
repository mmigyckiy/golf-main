import React, { useMemo } from "react";

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function formatDeg(val) {
  const v = Number.isFinite(val) ? val : 0;
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}°`;
}

export function AttackAngleWidget({ attackDeg = 0 }) {
  const readout = formatDeg(attackDeg);
  const shiftPx = useMemo(() => {
    const normalized = clamp(attackDeg / 8, -1, 1);
    return normalized * 10;
  }, [attackDeg]);

  return (
    <div className="swing-metric swing-metric--attack">
      <div className="swing-metric__title">ATTACK ANGLE</div>
      <div className="swing-metric__body">
        <div className="attack-angle" aria-label="Attack angle">
          <div className="attack-angle__meter attack-angle--plane">
            <div className="attack-angle__track"></div>
            <div className="attack-angle__sweet"></div>
            <div
              className="attack-angle__runner"
              style={{ "--attack-shift-px": `${shiftPx.toFixed(2)}px` }}
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>
      <div className="swing-metric__footer">
        <div className="swing-metric__value">{readout}</div>
        <div className="swing-metric__hint"></div>
      </div>
    </div>
  );
}
