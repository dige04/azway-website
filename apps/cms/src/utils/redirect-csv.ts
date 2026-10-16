// The legacy URL list (SEO-07) as CSV: header `from,to,statusCode`, one
// redirect per line; statusCode is optional (301). Fields may be quoted.
import schema from '../api/redirect/content-types/redirect/schema.json';
import { normalizeRedirectPath } from './redirect-path';

export interface RedirectRow {
  from: string;
  to: string;
  statusCode: 301 | 302;
}

const COLUMNS = ['from', 'to', 'statusCode'];
// The schema's own rules, checked before anything is written.
const FROM = new RegExp(schema.attributes.from.regex);
const TO = new RegExp(schema.attributes.to.regex);

/** RFC 4180 fields: "a,b" and "say ""hi""" are one field each; null if a quote is left open. */
const splitLine = (line: string): string[] | null => {
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
  return quoted ? null : [...fields, field].map((value) => value.trim());
};

/** What is wrong with a line, or null. `key` is the canonical `from`. */
const problemOf = (from: string, to: string, statusCode: number, key: string): string | null => {
  if (!from || !to) return 'from and to are required';
  if (!FROM.test(key)) return `from "${from}" is not a path`;
  if (!TO.test(to)) return `to "${to}" must start with / or https://`;
  // The lookup ignores the query, so "/a" -> "/a?x=1" loops too.
  if (to.startsWith('/') && normalizeRedirectPath(to) === key) return `${key} redirects to itself`;
  if (statusCode !== 301 && statusCode !== 302) return 'statusCode must be 301 or 302';
  return null;
};

/** Every row, or every problem with its line number (nothing is imported then). */
export const parseRedirectCsv = (text: string): { rows: RedirectRow[]; errors: string[] } => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header = splitLine(lines[0] ?? '') ?? [];
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
    const fields = splitLine(line);
    if (!fields || fields.length > COLUMNS.length) {
      errors.push(`${at}: expected ${COLUMNS.join(',')} (check commas and quotes)`);
      return;
    }
    const [from = '', to = '', code = ''] = fields;
    const statusCode = code === '' ? 301 : Number(code);
    const key = normalizeRedirectPath(from);
    const problem = problemOf(from, to, statusCode, key) ?? (seen.has(key) ? `${key} is already on line ${seen.get(key)}` : null);
    if (problem) {
      errors.push(`${at}: ${problem}`);
      return;
    }
    rows.push({ from, to, statusCode: statusCode as 301 | 302 });
    seen.set(key, index + 1);
  });
  return { rows, errors };
};
