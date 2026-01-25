export function xToYards(x){
  const val = Number.isFinite(x) ? x : 0;
  return Math.min(500, Math.max(0, Math.floor(val * 100)));
}
