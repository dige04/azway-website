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

/**
 * Related products from the cached catalog: same destination (any of the
 * product's), then `sameType`.
 */
export function relatedFromCatalog<T extends { documentId: string; destinations?: { slug: string }[] }>(
  product: T,
  catalog: T[],
  sameType: (item: T) => boolean,
): T[] {
  const places = new Set(product.destinations?.map((place) => place.slug));
  const sameDestination = catalog.filter((item) => item.destinations?.some((place) => places.has(place.slug)));
  return pickRelated(product.documentId, sameDestination, catalog.filter(sameType));
}

/**
 * The catalog for an optional block (related products): a failure is logged
 * and hides the block instead of failing the page.
 */
export async function catalogForRelated<T>(load: Promise<T[]>, what: string): Promise<T[]> {
  try {
    return await load;
  } catch (error) {
    console.error(`[related] ${what} unavailable:`, error instanceof Error ? error.message : error);
    return [];
  }
}
