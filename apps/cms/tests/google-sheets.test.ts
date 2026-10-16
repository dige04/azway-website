import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { leadToRow, signJwt } from '../src/services/google-sheets';

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
});
