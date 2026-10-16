/** Lower case without Vietnamese accents: "Hạ Long" and "ha long" both read "ha long". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/gi, 'd').toLowerCase();
}

/** "Lào Cai – Hà Khẩu" -> "lao-cai-ha-khau". */
export function slugify(text: string): string {
  return foldText(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Whether `text` holds every word of `query`, case and accents ignored ("ha long" finds "Hạ Long"). */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = foldText(text);
  return foldText(query).split(/\s+/).every((word) => haystack.includes(word));
}
