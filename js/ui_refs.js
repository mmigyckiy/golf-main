export function getUIRefs() {
  const byId = (id) => document.getElementById(id);
  return {
    uiRoot: byId("uiRoot"),
    tempo: {
      mount: byId("tempoMount"),
      control: byId("swingTempoControl"),
      pct: byId("swingTempoPct")
    },
    path: {
      mount: byId("pathMount"),
      pixi: byId("pathPixi"),
      ring: byId("alignmentRing"),
      svg: byId("alignmentSvg"),
      base: byId("alignmentBase"),
      sweet: byId("alignmentSweet"),
      runner: byId("alignmentRunner"),
      ball: byId("alignmentBall")
    },
    attack: {
      mount: byId("attackMount"),
      container: byId("attackAngle"),
      runner: byId("attackAngleRunner"),
      readout: byId("attackAngleReadout")
    },
    common: {
      swingMetricsRow: byId("swingMetricsRow")
    }
  };
}
