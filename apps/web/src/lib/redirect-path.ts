// Copy of apps/cms/src/utils/redirect-path.ts, which stores `redirect.from` in
// this form (ARCHITECTURE D8). The web bundle does not import from the CMS app;
// redirect-path.test.ts runs both copies on the same vectors so they agree.
export const normalizeRedirectPath = (input: string): string => {
  let path = input.trim().replace(/^https?:\/\/[^/?#]*/i, '');
  path = path.replace(/[?#].*$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  // Decode first so "/tour-hạ-long" and "/tour-h%E1%BA%A1-long" end up equal.
  // "%25" (a literal "%") stays encoded, so a stored value normalises to itself.
  try {
    path = decodeURI(path.replace(/%25/gi, '%2525'));
  } catch {
    // Malformed escape: encode as typed.
  }
  // Concatenated, not `new URL(path, base)`: that would read "//evil" as a host.
  path = new URL(`http://x${path}`).pathname;
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
};
