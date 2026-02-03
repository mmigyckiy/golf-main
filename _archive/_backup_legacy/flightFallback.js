"use strict";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

let rafId = null;
let running = false;
let startTs = 0;
let duration = 1200;
let targetYards = 240;
let currentYards = 0;
let onTick = null;
let onEnd = null;
let onCrash = null;

function loop(ts){
  if(!running) return;
  if(!startTs) startTs = ts;
  const p = clamp((ts - startTs) / duration, 0, 1);
  currentYards = targetYards * p;
  if(onTick){
    try{ onTick({ yards: currentYards, p, isAirborne:true }); }catch(_){}
  }
  if(p >= 1){
    running = false;
    rafId = null;
    if(onEnd){
      try{ onEnd({ finalYards: currentYards, crashed:false }); }catch(_){}
    }
    return;
  }
  rafId = requestAnimationFrame(loop);
}

export function initFlight3D(){
  return {
    startFlight3D: () => startFlight(),
    updateFlight3D: () => {},
    crashFlight3D: () => crashNow(),
    landFlight3D: (yd) => { targetYards = clamp(yd || 0, 0, 2000); },
    resetFlight3D: reset,
    getFlightDistanceYards: () => currentYards,
    startFlight,
    crashNow,
    reset,
    isRunning: () => running,
    unsupported: false
  };
}

export function startFlight(params = {}){
  targetYards = clamp(Number(params.targetYards || targetYards), 0, 2000);
  duration = clamp(Number(params.duration || 1200), 300, 4000);
  onTick = params.onTick || null;
  onEnd = params.onEnd || null;
  onCrash = params.onCrash || null;
  running = true;
  startTs = 0;
  currentYards = 0;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

export function crashNow(){
  if(!running) return;
  running = false;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if(onCrash){
    try{ onCrash({ finalYards: currentYards, crashed:true }); }catch(_){}
  }
  if(onEnd){
    try{ onEnd({ finalYards: currentYards, crashed:true }); }catch(_){}
  }
}

export function reset(){
  running = false;
  currentYards = 0;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
}
