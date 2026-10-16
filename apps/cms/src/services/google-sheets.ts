// Google Sheets append via service-account JWT (ARCHITECTURE D6): RS256 with
// node:crypto, no googleapis dependency.
import { createSign } from 'node:crypto';

export type SheetsConfig = {
  clientEmail: string;
  privateKey: string;
  sheetId: string;
  range: string;
  tokenUrl: string;
  apiUrl: string;
};

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const REQUEST_TIMEOUT_MS = 10_000;

/** Null when any required variable is missing: leads are then `skipped`. */
export const sheetsConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): SheetsConfig | null => {
  const { GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_SHEET_ID } = env;
  if (!GOOGLE_SA_EMAIL || !GOOGLE_SA_PRIVATE_KEY || !GOOGLE_SHEET_ID) return null;
  return {
    clientEmail: GOOGLE_SA_EMAIL,
    // .env files carry the PEM on one line with literal "\n".
    privateKey: GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
    sheetId: GOOGLE_SHEET_ID,
    range: env.GOOGLE_SHEET_RANGE || 'A:S',
    // Overridable only to point tests at a local server.
    tokenUrl: env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    apiUrl: env.GOOGLE_SHEETS_API_URL || 'https://sheets.googleapis.com',
  };
};

const base64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

export const signJwt = (config: Pick<SheetsConfig, 'clientEmail' | 'privateKey' | 'tokenUrl'>, nowSec: number) => {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({ iss: config.clientEmail, scope: SCOPE, aud: config.tokenUrl, iat: nowSec, exp: nowSec + 3600 })
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(config.privateKey);
  return `${header}.${claims}.${base64url(signature)}`;
};

export class SheetsError extends Error {
  constructor(
    message: string,
    /** False for errors a retry cannot fix (4xx other than 408/429). */
    readonly retryable: boolean
  ) {
    super(message);
  }
}

const check = async (response: Response, what: string) => {
  if (response.ok) return;
  const body = (await response.text().catch(() => '')).slice(0, 300);
  const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
  throw new SheetsError(`${what} HTTP ${response.status} ${body}`.trim(), retryable);
};

let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

const getAccessToken = async (config: SheetsConfig, fetchImpl: typeof fetch) => {
  const key = `${config.tokenUrl}|${config.clientEmail}`;
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const response = await fetchImpl(config.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(config, Math.floor(Date.now() / 1000)),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  await check(response, 'token');
  const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };
  // Renew a minute early so a request never carries an expiring token.
  cachedToken = { key, token: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
};

export const appendRow = async (config: SheetsConfig, row: (string | number)[], fetchImpl: typeof fetch = fetch) => {
  const url = `${config.apiUrl}/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(
    config.range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const append = async () =>
    fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${await getAccessToken(config, fetchImpl)}`, 'content-type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  let response = await append();
  // A revoked or expired cached token: fetch a new one and try once more.
  if (response.status === 401) {
    cachedToken = null;
    response = await append();
  }
  await check(response, 'append');
};

export type LeadRow = {
  documentId: string;
  createdAt: string | Date;
  fullName: string;
  phone: string;
  email?: string | null;
  organization?: string | null;
  travelDate?: string | null;
  groupSize?: number | null;
  need?: string | null;
  note?: string | null;
  productType?: string | null;
  productCode?: string | null;
  productName?: string | null;
  sourcePage?: string | null;
  landingPage?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  device?: string | null;
};

// USER_ENTERED evaluates "=…", "+…", "-…", "@…" as formulas and turns
// "0912…" into a number. A leading apostrophe makes Sheets store the cell as
// plain text (the apostrophe is not displayed), so every visitor-supplied
// string gets one.
export const asText = (value: string | null | undefined) => (value ? `'${value}` : '');

const vnDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(value)
  );

/** Column order is fixed by ARCHITECTURE.md ("Cột Sheets"). */
export const leadToRow = (lead: LeadRow): (string | number)[] => [
  vnDateTime(lead.createdAt),
  asText(lead.fullName),
  asText(lead.phone),
  asText(lead.email),
  asText(lead.organization),
  lead.travelDate ?? '',
  lead.groupSize ?? '',
  asText(lead.need),
  asText(lead.note),
  asText(lead.productType),
  asText(lead.productCode),
  asText(lead.productName),
  asText(lead.sourcePage),
  asText(lead.landingPage),
  asText(lead.utm_source),
  asText(lead.utm_medium),
  asText(lead.utm_campaign),
  asText(lead.device),
  asText(lead.documentId),
];
