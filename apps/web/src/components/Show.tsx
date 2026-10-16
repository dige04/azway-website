import type { ReactNode } from 'react';
import { hasContent } from '@/lib/present';

/**
 * FR-PRD-05: renders nothing when `when` has no content (see `hasContent`),
 * so a block never shows an empty heading or frame.
 *
 *   <Show when={tour.highlights}>{(items) => <Highlights items={items} />}</Show>
 */
export function Show<T>({ when, children }: { when: T | null | undefined; children: (value: NonNullable<T>) => ReactNode }) {
  return hasContent(when) ? children(when as NonNullable<T>) : null;
}
