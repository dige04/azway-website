// Canonical form of `redirect.from` (ARCHITECTURE D8): path only, decoded,
// no query/hash, no trailing slash. The web app must normalise the request
// pathname the same way before looking it up.
export const normalizeRedirectPath = (input: string): string => {
  let path = input.trim().replace(/^https?:\/\/[^/?#]*/i, '');
  path = path.replace(/[?#].*$/, '');
  try {
    path = decodeURI(path);
  } catch {
    // Malformed escape sequence: keep as typed; the schema regex still applies.
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
};
