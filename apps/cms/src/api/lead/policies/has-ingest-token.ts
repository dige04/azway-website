import { createHash, timingSafeEqual } from 'node:crypto';

// A short or placeholder token (e.g. `tobemodified` from .env.example) counts
// as missing: every request is refused rather than the endpoint left open.
const MIN_TOKEN_LENGTH = 32;
const digest = (value: string) => createHash('sha256').update(value).digest();

export default (policyContext: { request: { header: Record<string, string | string[] | undefined> } }) => {
  const expected = process.env.LEAD_INGEST_TOKEN ?? '';
  const given = policyContext.request.header['x-lead-token'];
  const valid =
    expected.length >= MIN_TOKEN_LENGTH &&
    typeof given === 'string' &&
    // Hashing first gives equal-length buffers, as timingSafeEqual requires.
    timingSafeEqual(digest(given), digest(expected));
  if (!valid) throw Object.assign(new Error('Invalid or missing X-Lead-Token'), { status: 401, expose: true });
  return true;
};
