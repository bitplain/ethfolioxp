export function buildPricePruneWhere(cutoffTs: number) {
  return { bucketTs: { lt: cutoffTs } };
}
