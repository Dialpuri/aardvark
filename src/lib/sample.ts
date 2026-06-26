/** Deterministic PRNG (mulberry32) so sample data is stable across renders. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Draw `n` samples from a normal distribution (Box–Muller). Seeded, so the
 * same arguments always yield the same data — handy for demo distributions.
 */
export function sampleNormal(
  mean: number,
  sd: number,
  n: number,
  seed = 1,
): number[] {
  const rand = mulberry32(seed)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const u1 = rand() || 1e-9
    const u2 = rand()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    out.push(mean + z * sd)
  }
  return out
}
