import React, { useMemo } from "react";

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function TempoWidget({ tempo01 = 0 }) {
  const v = clamp01(tempo01);
  const percent = Math.round(v * 100);

  const runnerStyle = useMemo(() => {
    return {
      height: `${(v * 100).toFixed(1)}%`,
      bottom: "0px",
    };
  }, [v]);

  const beginHold = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    window.DrivixUIInput?.beginHold?.();
  };

  const releaseHold = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    window.DrivixUIInput?.release?.();
  };

  return (
    <div className="swing-metric swing-metric--tempo">
      <div className="swing-metric__title">SWING TEMPO</div>
      <div className="swing-metric__body">
        <div
          className="tempo-meter"
          aria-label="Swing tempo"
          role="button"
          tabIndex={0}
          onPointerDown={beginHold}
          onPointerUp={releaseHold}
          onPointerCancel={releaseHold}
          onKeyDown={(e) => {
            if (e.repeat) return;
            if (e.key === " " || e.key === "Enter") beginHold(e);
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") releaseHold(e);
          }}
        >
          <div className="tempo-meter__scale" aria-hidden="true">
            <span className="tempo-meter__label" data-value="100">100</span>
            <span className="tempo-meter__tick tempo-meter__tick--major"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__label" data-value="50">50</span>
            <span className="tempo-meter__tick tempo-meter__tick--major"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__tick"></span>
            <span className="tempo-meter__label" data-value="0">0</span>
          </div>
          <div className="tempo-meter__tube" aria-hidden="true">
            <div className="tempo-meter__runner" style={runnerStyle}></div>
          </div>
        </div>
      </div>
      <div className="swing-metric__footer">
        <div className="swing-metric__value">{percent}%</div>
        <div className="swing-metric__hint">HOLD • RELEASE</div>
      </div>
    </div>
  );
}
