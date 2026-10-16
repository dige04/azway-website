import Script from 'next/script';
import { Suspense } from 'react';
import { GtagEvents } from './GtagEvents';

/**
 * GA4 (AN-01..04), only when NEXT_PUBLIC_GA_ID is set at build (never in
 * dev/CI). gtag.js loads when the browser is idle after load, so it never
 * delays the first paint; calls made before that wait in dataLayer.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="lazyOnload" />
      {/* useSearchParams: the boundary keeps the rest of the page static. */}
      <Suspense fallback={null}>
        <GtagEvents id={id} />
      </Suspense>
    </>
  );
}
