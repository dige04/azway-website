/**
 * Analytics events (BRD §9, AN-xx). Stub until GA4 lands (WP-14): every event
 * is dispatched as a `azway:track` DOM event, which GA4 wiring (and tests)
 * can listen to without touching the call sites.
 */
export type TrackEvent = 'click_call' | 'click_zalo' | 'click_messenger' | 'filter_apply';

export function track(event: TrackEvent, params: Record<string, string> = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('azway:track', { detail: { event, ...params } }));
}
