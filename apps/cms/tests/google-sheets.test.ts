import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { appendRow, leadToRow, SheetsError, signJwt, type SheetsConfig } from '../src/services/google-sheets';

describe('google-sheets', () => {
  it('signs a service-account JWT that verifies with the public key', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const config = {
      clientEmail: 'sa@azway.iam.gserviceaccount.com',
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      tokenUrl: 'https://oauth2.googleapis.com/token',
    };
    const jwt = signJwt(config, 1_700_000_000);
    const [header, claims, signature] = jwt.split('.');

    const verified = createVerify('RSA-SHA256').update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, 'base64url'));
    expect(verified).toBe(true);
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
      iss: config.clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: config.tokenUrl,
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('writes visitor input as plain text so USER_ENTERED cannot run formulas', () => {
    const row = leadToRow({
      documentId: 'abc',
      createdAt: '2026-10-16T09:00:00Z',
      fullName: '=HYPERLINK("http://evil","x")',
      phone: '0912345678',
      note: '+1',
      need: '-2',
      organization: '@SUM(A1)',
      groupSize: 20,
    });
    expect(row).toHaveLength(19);
    expect(row[0]).toBe('2026-10-16 16:00:00');
    for (const cell of [row[1], row[2], row[4], row[7], row[8], row[18]]) expect(String(cell).startsWith("'")).toBe(true);
    expect(row[6]).toBe(20);
  });

  it('renews the access token once when an append gets 401', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const config: SheetsConfig = {
      clientEmail: 'sa@azway.iam.gserviceaccount.com',
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      sheetId: 's',
      range: 'A:S',
      tokenUrl: 'http://google.test/token',
      apiUrl: 'http://google.test',
    };
    const appendStatuses: number[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === config.tokenUrl) return Response.json({ access_token: 'token', expires_in: 3600 });
      return new Response('{}', { status: appendStatuses.shift() ?? 200 });
    });
    const calls = (kind: 'token' | 'append') =>
      fetchImpl.mock.calls.filter(([url]) => (String(url) === config.tokenUrl) === (kind === 'token')).length;

    appendStatuses.push(401, 200);
    await appendRow(config, ['x'], fetchImpl as unknown as typeof fetch);
    expect([calls('token'), calls('append')]).toEqual([2, 2]);

    // A second 401 in a row is an error, not a loop.
    appendStatuses.push(401, 401);
    await expect(appendRow(config, ['x'], fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(SheetsError);
    expect(calls('append')).toBe(4);
  });
});
