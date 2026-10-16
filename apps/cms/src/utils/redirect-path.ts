// Canonical form of `redirect.from` (ARCHITECTURE D8): the path as a browser
// sends it — percent-encoded like `new URL(…).pathname` — without host,
// query, hash or trailing slash. The web app canonicalises the request
// pathname with the same steps before looking it up.
export const normalizeRedirectPath = (input: string): string => {
  let path = input.trim().replace(/^https?:\/\/[^/?#]*/i, '');
  path = path.replace(/[?#].*$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  // Decode first so "/tour-hạ-long" and "/tour-h%E1%BA%A1-long" end up equal.
  try {
    path = decodeURI(path);
  } catch {
    // Malformed escape: encode as typed.
  }
  // Concatenated, not `new URL(path, base)`: that would read "//evil" as a host.
  path = new URL(`http://x${path}`).pathname;
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
};
