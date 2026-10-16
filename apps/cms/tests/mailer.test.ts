import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendMail } from '../src/services/mailer';

const mail = { to: ['sales@example.com'], subject: 's', text: 't', logSummary: 'lead x' };
const log = { info: vi.fn(), error: vi.fn() };

afterEach(() => vi.unstubAllEnvs());

describe('sendMail', () => {
  // Only `failed` counts toward the retry limit; missing Resend config is D7's log-only mode.
  it('tells "not configured" apart from a failed send', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"error":"x"}', { status: 500 }));
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendMail(mail, log, fetchImpl)).toBe('logged');
    expect(fetchImpl).not.toHaveBeenCalled();

    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'AZway <no-reply@example.com>');
    expect(await sendMail(mail, log, fetchImpl)).toBe('failed');
    expect(await sendMail({ ...mail, to: [] }, log, fetchImpl)).toBe('failed');
  });
});
