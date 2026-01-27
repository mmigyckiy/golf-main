import { TEMPO_ARC } from "./controls/tempoArc.js";

const state = {
  active: false,
  t: 0,
  speed: (Math.PI * 2) / 1.8,
  fatigueFactor: 1,
  noisePhase: 0,
  headPos: 0,
  angle: TEMPO_ARC.targetAngle
};

function beginHold(startMs){
  state.active = true;
  state.t = 0;
  state.noisePhase = 0;
  state.headPos = 0;
  state.angle = TEMPO_ARC.targetAngle;
}

function update(dtMs){
  if(!state.active) return;
  const dt = Math.max(0.001, (dtMs || 0) / 1000);
  state.t += dt;
  state.noisePhase += dt * 0.9;
  const wobble = 1 + 0.04 * Math.sin(state.noisePhase);
  const phase = state.t * state.speed * state.fatigueFactor * wobble;
  state.headPos = 0.5 + 0.5 * Math.sin(phase);
  state.angle = TEMPO_ARC.arcStart + (TEMPO_ARC.arcEnd - TEMPO_ARC.arcStart) * state.headPos;
}

function lock(){
  state.active = false;
  return {
    headPos: state.headPos,
    angle: state.angle
  };
}

function reset(){
  state.active = false;
  state.t = 0;
  state.noisePhase = 0;
  state.headPos = 0;
  state.angle = TEMPO_ARC.targetAngle;
}

function getHeadPos(){
  return state.headPos;
}

function getAngle(){
  return state.angle;
}

function isActive(){
  return state.active;
}

export const SwingTempo = {
  beginHold,
  update,
  lock,
  reset,
  getHeadPos,
  getAngle,
  isActive
};
