export function getUIRefs() {
  const byId = (id) => document.getElementById(id);
  return {
    uiRoot: byId("uiRoot"),
    tempo: {
      control: byId("swingTempoControl"),
      tube: byId("swingTempoTube"),
      runner: byId("swingTempoRunner"),
      pct: byId("swingTempoPct")
    },
    path: {
      mount: byId("pathPixi"),
      ring: byId("alignmentRing"),
      svg: byId("alignmentSvg"),
      base: byId("alignmentBase"),
      sweet: byId("alignmentSweet"),
      runner: byId("alignmentRunner"),
      ball: byId("alignmentBall")
    },
    attack: {
      container: byId("attackAngle"),
      plane: byId("attackAnglePlane"),
      runner: byId("attackAngleRunner"),
      sweet: byId("attackAngleSweet"),
      readout: byId("attackAngleReadout")
    },
    common: {
      swingMetricsRow: byId("swingMetricsRow")
    }
  };
}
