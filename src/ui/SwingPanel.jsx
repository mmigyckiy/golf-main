import React from "react";
import { TempoWidget } from "./TempoWidget.jsx";
import { SwingPathWidget } from "./SwingPathWidget.jsx";
import { AttackAngleWidget } from "./AttackAngleWidget.jsx";

export function SwingPanel({ snapshot }) {
  const {
    phase,
    locked,
    tempo01,
    path01,
    attackDeg,
    sweetStart01,
    sweetEnd01
  } = snapshot;

  return (
    <div className="swing-metrics-row" id="swingMetricsRow">
      <TempoWidget
        phase={phase}
        locked={locked}
        tempo01={tempo01}
        sweetStart01={sweetStart01}
        sweetEnd01={sweetEnd01}
      />
      <SwingPathWidget
        phase={phase}
        locked={locked}
        path01={path01}
        sweetStart01={sweetStart01}
        sweetEnd01={sweetEnd01}
        intensity01={tempo01}
      />
      <AttackAngleWidget phase={phase} locked={locked} attackDeg={attackDeg} />
    </div>
  );
}
