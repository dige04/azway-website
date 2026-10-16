/**
 * FR-PRD-06: up to `limit` other products, same destination first, then same
 * type; no duplicates, never the product itself.
 */
export function pickRelated<T extends { documentId: string }>(
  currentId: string,
  sameDestination: T[],
  sameType: T[],
  limit = 4,
): T[] {
  const picked = new Map<string, T>();
  for (const item of [...sameDestination, ...sameType]) {
    if (picked.size === limit) break;
    if (item.documentId !== currentId) picked.set(item.documentId, item);
  }
  return [...picked.values()];
}
