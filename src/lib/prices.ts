export function pickNearbyBucket(target: number, buckets: number[], maxAge: number) {
  let closest: number | null = null;
  let minDiff = Number.POSITIVE_INFINITY;

  for (const bucket of buckets) {
    const diff = Math.abs(bucket - target);
    if (diff <= maxAge && diff < minDiff) {
      minDiff = diff;
      closest = bucket;
    }
  }

  return closest;
}
