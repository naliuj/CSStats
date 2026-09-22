/**
 * Session id maps (old id → new id). Edits can renumber sessions; views use these to keep
 * pointing at the same sessions. An id missing from a map means that session is gone.
 */
export type IdMap = ReadonlyMap<string, string>;

export const invert = (m: IdMap): Map<string, string> => new Map([...m].map(([a, b]) => [b, a]));

/** First `a`, then `b`. */
export function compose(a: IdMap, b: IdMap): Map<string, string> {
  const out = new Map<string, string>();
  for (const [from, mid] of a) {
    const to = b.get(mid);
    if (to != null) out.set(from, to);
  }
  return out;
}

export const identity = (ids: Iterable<string>): Map<string, string> => new Map([...ids].map((id) => [id, id]));

export const mapIds = (ids: Iterable<string>, m: IdMap): string[] =>
  [...ids].map((id) => m.get(id)).filter((id): id is string => id != null);
