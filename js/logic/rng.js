export function clamp(n, min, max){
  return Math.min(max, Math.max(min, n));
}

export function clamp01(x){
  return clamp(x, 0, 1);
}

export function randInt(a, b){
  const min = Math.ceil(a);
  const max = Math.floor(b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Box–Muller
export function randn(){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function pickWeighted(items){
  const total = items.reduce((acc, item) => acc + (item.weight || 0), 0);
  if(total <= 0) return items[0]?.value;
  const r = Math.random() * total;
  let acc = 0;
  for(const item of items){
    acc += item.weight || 0;
    if(r <= acc) return item.value;
  }
  return items[items.length - 1]?.value;
}
