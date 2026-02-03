export function getUIRefs() {
  return {
    tempo: {
      control: document.getElementById("swingTempoControl"),
      tube: document.getElementById("swingTempoTube"),
      fill: document.getElementById("swingTempoFill"),
      runner: document.getElementById("swingTempoRunner"),
      pct: document.getElementById("swingTempoPct")
    },
    path: {
      mount: document.getElementById("pathPixi"),
      ring: document.getElementById("alignmentRing"),
      svg: document.getElementById("alignmentSvg"),
      base: document.getElementById("alignmentBase"),
      sweet: document.getElementById("alignmentSweet"),
      runner: document.getElementById("alignmentRunner"),
      ball: document.getElementById("alignmentBall")
    },
    attack: {
      container: document.getElementById("attackAngle"),
      plane: document.getElementById("attackAnglePlane"),
      runner: document.getElementById("attackAngleRunner"),
      sweet: document.getElementById("attackAngleSweet"),
      readout: document.getElementById("attackAngleReadout")
    },
    common: {
      swingMetricsRow: document.getElementById("swingMetricsRow")
    }
  };
}
