import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { JsonLd } from './JsonLd';

// CMS text goes into JSON-LD unescaped by React: it must not end the script and start markup of its own.
it('text containing </script><script> stays data inside the one JSON-LD script', () => {
  const headline = 'Tour </script><script>alert(1)</script><!-- Hạ Long';
  const html = renderToStaticMarkup(createElement(JsonLd, { data: { headline } }));
  expect(html.match(/<\/?script/gi)).toHaveLength(2);
  const json = /^<script type="application\/ld\+json">(.*)<\/script>$/s.exec(html)?.[1];
  expect(JSON.parse(json ?? '')).toEqual({ headline });
});
