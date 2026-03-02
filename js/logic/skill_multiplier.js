function clamp(value, min, max){
  const v = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, v));
}

function sampleGammaApprox(rng, shape){
  const s = Math.max(0.0001, Number(shape) || 1);
  const whole = Math.max(1, Math.floor(s));
  let acc = 0;
  for(let i = 0; i < whole; i += 1){
    const u = Math.max(1e-9, Math.min(1 - 1e-9, rng()));
    acc += -Math.log(u);
  }
  const frac = s - whole;
  if(frac > 0){
    const u = Math.max(1e-9, Math.min(1 - 1e-9, rng()));
    acc += (-Math.log(u)) * frac;
  }
  return Math.max(1e-9, acc);
}

function betaApprox(rng, a, b){
  const ga = sampleGammaApprox(rng, a);
  const gb = sampleGammaApprox(rng, b);
  const denom = ga + gb;
  if(!(denom > 0)) return 0.5;
  return clamp(ga / denom, 0, 1);
}

export function computeRoundMultiplier(input = {}, rng = Math.random){
  const tempoQuality = clamp(Number(input.tempoQuality), 0, 1);
  const pathQuality = clamp(Number(input.pathQuality), 0, 1);
  const risk = clamp(Number(input.risk), 0, 1);

  const base = 0.55 * tempoQuality + 0.45 * pathQuality;
  const failProb = clamp(0.18 - 0.12 * base + 0.22 * risk, 0.05, 0.35);
  const jackpotProb = clamp(0.02 + 0.06 * (base * base) + 0.08 * risk, 0.01, 0.18);

  const rollFail = rng();
  let x = 1.05;
  let mode = "main";

  if(rollFail < failProb){
    x = 1.0 + betaApprox(rng, 2, 8) * 0.9;
    x = clamp(x, 1.0, 1.9);
    mode = "fail";
  }else{
    const rollJackpot = rng();
    if(rollJackpot < jackpotProb){
      x = 4.0 + Math.pow(rng(), 0.35) * 10.0;
      x = clamp(x, 4.0, 20.0);
      mode = "jackpot";
    }else{
      const mu = 1.15 + 2.2 * base + 0.35 * risk;
      const noise = (rng() - 0.5) * (0.55 - 0.35 * base);
      x = clamp(mu + noise, 1.05, 6.0);
      mode = "main";
    }
  }

  return {
    x,
    breakdown: {
      base,
      failProb,
      jackpotProb,
      mode
    }
  };
}

