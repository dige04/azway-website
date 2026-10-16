/** Lower case without Vietnamese accents: "Hạ Long" and "ha long" both read "ha long". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/gi, 'd').toLowerCase();
}

/** "Lào Cai – Hà Khẩu" -> "lao-cai-ha-khau". */
export function slugify(text: string): string {
  return foldText(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
