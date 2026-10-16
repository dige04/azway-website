// The legacy URL list (SEO-07) as CSV: header `from,to,statusCode`, one
// redirect per line; statusCode is optional (301). Fields may be quoted.
import { normalizeRedirectPath } from './redirect-path';

export interface RedirectRow {
  from: string;
  to: string;
  statusCode: 301 | 302;
}

const COLUMNS = ['from', 'to', 'statusCode'];

/** RFC 4180 fields: "a,b" and "say ""hi""" are one field each. */
const splitLine = (line: string): string[] => {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') field += line[++i];
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else field += char;
  }
  return [...fields, field].map((value) => value.trim());
};

/** Every row, or every problem with its line number (nothing is imported then). */
export const parseRedirectCsv = (text: string): { rows: RedirectRow[]; errors: string[] } => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header = splitLine(lines[0] ?? '');
  if (header.length < 2 || header.some((name, i) => name !== COLUMNS[i])) {
    return { rows: [], errors: [`line 1: header must be "${COLUMNS.join(',')}" (statusCode optional)`] };
  }
  const rows: RedirectRow[] = [];
  const errors: string[] = [];
  // Two lines for one old URL would overwrite each other on every run.
  const seen = new Map<string, number>();
  lines.forEach((line, index) => {
    if (index === 0 || !line.trim()) return;
    const at = `line ${index + 1}`;
    const [from = '', to = '', code = ''] = splitLine(line);
    const statusCode = code === '' ? 301 : Number(code);
    const key = normalizeRedirectPath(from);
    if (!from || !to) errors.push(`${at}: from and to are required`);
    else if (statusCode !== 301 && statusCode !== 302) errors.push(`${at}: statusCode must be 301 or 302`);
    else if (seen.has(key)) errors.push(`${at}: ${key} is already on line ${seen.get(key)}`);
    else {
      rows.push({ from, to, statusCode });
      seen.set(key, index + 1);
    }
  });
  return { rows, errors };
};
