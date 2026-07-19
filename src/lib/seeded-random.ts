/**
 * Deterministic PRNG helpers.
 *
 * `agents.ts` carries private copies of these; they are duplicated here rather
 * than lifted so the walk feature does not have to edit that file while it is
 * being actively changed. Worth collapsing into this module once both settle.
 */

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A PRNG seeded by arbitrary string parts, so callers do not hash by hand. */
export function seededRandom(...parts: string[]): () => number {
  return mulberry32(hashString(parts.join(":")));
}
