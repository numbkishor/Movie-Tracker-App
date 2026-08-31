import "server-only";

/**
 * A deliberately small in-memory limiter, sized for a friend group on a single
 * serverless region. It is not a distributed rate limiter and does not pretend
 * to be — it exists so one runaway client (a search box in a render loop, say)
 * cannot burn through the TMDB quota. Adding Redis for this would be a paid
 * dependency, which docs/prd.md rules out at this scale.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

export function rateLimit(key: string, options: { limit: number; windowMs: number }): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      pruneExpired(now);
    }

    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (existing.count >= options.limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  // Still full of live buckets: drop the oldest insertions rather than growing
  // without bound.
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const overflow = buckets.size - Math.floor(MAX_TRACKED_KEYS / 2);
    let removed = 0;

    for (const key of buckets.keys()) {
      if (removed >= overflow) break;
      buckets.delete(key);
      removed += 1;
    }
  }
}
