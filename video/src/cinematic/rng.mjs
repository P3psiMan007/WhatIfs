// Deterministic pseudo-randomness. Remotion renders frames out of order and in
// parallel processes, so anything using Math.random would shimmer between
// frames. Every scattered element (stars, dust, windows) is placed from a seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scatter(seed, count, build) {
  const random = mulberry32(seed);
  return Array.from({length: count}, (_, index) => build(random, index));
}
