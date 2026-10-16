// Email via the Resend REST API (ARCHITECTURE D7). Without RESEND_API_KEY the
// message is only logged — with the caller's masked summary, never the body.

export type Mail = { to: string[]; subject: string; text: string; logSummary: string };
type Logger = { info: (msg: string) => void; error: (msg: string) => void };

export const parseEmailList = (value: string | null | undefined) =>
  (value ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** `logged`: Resend not configured, so only logged by design (D7) — not a failure. */
export type MailOutcome = 'sent' | 'logged' | 'failed';

export const sendMail = async (mail: Mail, log: Logger, fetchImpl: typeof fetch = fetch): Promise<MailOutcome> => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    log.info(`[mail] RESEND_API_KEY/MAIL_FROM not set, not sent to ${mail.to.length} recipient(s): ${mail.logSummary}`);
    return 'logged';
  }
  if (!mail.to.length) {
    log.error(`[mail] no recipient configured: ${mail.logSummary}`);
    return 'failed';
  }
  try {
    // Overridable only to point tests at a local server.
    const response = await fetchImpl(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    log.info(`[mail] sent to ${mail.to.length} recipient(s): ${mail.logSummary}`);
    return 'sent';
  } catch (error) {
    log.error(`[mail] failed (${(error as Error).message}): ${mail.logSummary}`);
    return 'failed';
  }
};
