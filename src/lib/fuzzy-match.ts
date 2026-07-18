export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Smallest edit distance between `query` and any word (or the whole string) in `text`. */
export function fuzzyDistance(query: string, text: string): number {
  const words = text.split(/\s+/);
  let best = levenshtein(query, text);
  for (const word of words) {
    best = Math.min(best, levenshtein(query, word));
  }
  return best;
}

export function fuzzyThreshold(queryLength: number): number {
  if (queryLength <= 3) return 1;
  if (queryLength <= 6) return 2;
  return 3;
}
