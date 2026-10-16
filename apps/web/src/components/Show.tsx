import type { ReactNode } from 'react';
import { hasContent } from '@/lib/present';

/**
 * FR-PRD-05: renders nothing when `when` has no content (see `hasContent`),
 * so a block never shows an empty heading or frame. A list reaches
 * `children` without its empty items.
 *
 *   <Show when={tour.highlights}>{(items) => <Highlights items={items} />}</Show>
 */
export function Show<T>({ when, children }: { when: T | null | undefined; children: (value: NonNullable<T>) => ReactNode }) {
  if (!hasContent(when)) return null;
  const value = Array.isArray(when) ? when.filter(hasContent) : when;
  return children(value as NonNullable<T>);
}
