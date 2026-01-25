// Pure golf shot math helpers (no DOM)

export function clamp(n, a, b){
  return Math.min(b, Math.max(a, n));
}

export const CLUBS = [
  { id:"putter", name:"Putter", maxX:2.2, carryMin:2,   carryMax:18,  accPenaltyMax:4,  growthFactor:0.65, crashRisk:0.70, holeTolerance:0.14 },
  { id:"wedge",  name:"Wedge",  maxX:3.0, carryMin:35,  carryMax:110, accPenaltyMax:10, growthFactor:0.78, crashRisk:0.85, holeTolerance:0.11 },
  { id:"iron7",  name:"7 Iron", maxX:3.8, carryMin:90,  carryMax:160, accPenaltyMax:14, growthFactor:0.95, crashRisk:1.00, holeTolerance:0.09 },
  { id:"iron5",  name:"5 Iron", maxX:4.4, carryMin:120, carryMax:190, accPenaltyMax:16, growthFactor:1.00, crashRisk:1.08, holeTolerance:0.085 },
  { id:"wood",   name:"3 Wood", maxX:5.2, carryMin:160, carryMax:230, accPenaltyMax:18, growthFactor:1.10, crashRisk:1.18, holeTolerance:0.075 },
  { id:"driver", name:"Driver", maxX:6.0, carryMin:190, carryMax:270, accPenaltyMax:22, growthFactor:1.18, crashRisk:1.30, holeTolerance:0.070 }
];

export function xToProgress(x, maxX){
  const m = maxX || 6;
  return clamp((x - 1) / (m - 1), 0, 1);
}

// Smooth carry: visible early motion, but not too fast
export function xToCarryYards(x, maxX, club){
  const m = club?.maxX ?? maxX ?? 6;
  const p = clamp((x - 1) / (m - 1), 0, 1);
  const curve = Math.pow(p, 0.85);
  const min = club?.carryMin ?? 20;
  const max = club?.carryMax ?? 120;
  return min + curve * (max - min);
}

export function accuracyPenalty(absDiff, club){
  const accMax = club?.accPenaltyMax ?? 18;
  const tol = club?.holeTolerance ?? 0.1;
  const t = clamp(absDiff / (tol * 2.5), 0, 1);
  return t * accMax;
}

export function computeShotGain({cashoutX, crashX, club}){
  const maxX = club?.maxX ?? 6;
  const accuracy = Math.abs((crashX ?? maxX) - cashoutX);
  const carryYards = xToCarryYards(cashoutX, maxX, club);
  const penaltyYards = accuracyPenalty(accuracy, club);
  const gainYards = Math.max(1, carryYards - penaltyYards);
  return { gainYards, accuracy, carryYards, penaltyYards };
}

export function yardsToPixelX({yards, totalYards = 300, startX, endX}){
  const y = clamp(yards, 0, totalYards);
  const p = totalYards ? y / totalYards : 0;
  return startX + (endX - startX) * p;
}

export function genCrashX(maxX = 6, crashRisk = 1){
  const u = Math.random();
  const base = 1.05 + (-Math.log(1 - u)) * 0.95;
  const crashX = 1.05 + (base - 1.05) / (crashRisk || 1);
  return clamp(crashX, 1.05, maxX);
}
