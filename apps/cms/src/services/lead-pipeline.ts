// Lead pipeline (ARCHITECTURE "Luồng lead", D1/D10): the lead is saved first,
// then email + Google Sheets run in the background with retry and alerting.
import type { Core } from '@strapi/strapi';
import { appendRow, leadToRow, sheetsConfigFromEnv, SheetsError, type LeadRow, type SheetsConfig } from './google-sheets';
import { mailConfigured, parseEmailList, sendMail } from './mailer';
import { maskEmail, maskPhone } from './mask';

export const RETRY_DELAYS_MS = [1000, 3000, 9000];
/** Sync rounds per lead (first run + cron), each round up to 1 + RETRY_DELAYS_MS.length requests. */
export const MAX_SYNC_ROUNDS = 10;
/** Failed notification sends per lead (first run + cron), counted apart from Sheets rounds. */
export const MAX_NOTIFY_ATTEMPTS = 10;
/**
 * Notifications are only (re)sent for leads younger than this, so turning on
 * Resend after a while without it does not email every old lead at once.
 */
export const NOTIFY_WINDOW_MS = 24 * 60 * 60 * 1000;

type SheetsStatus = 'pending' | 'synced' | 'failed' | 'skipped';
export type LeadRecord = LeadRow & {
  sheetsStatus: SheetsStatus;
  sheetsAttempts: number;
  notifiedAt?: string | Date | null;
  notifyAttempts: number;
};
export type SyncResult = { sheetsStatus: SheetsStatus; sheetsAttempts: number; sheetsError: string | null };
export type SyncDeps = {
  config: SheetsConfig | null;
  append: (config: SheetsConfig, row: (string | number)[]) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  alert: (lead: LeadRecord, result: SyncResult) => Promise<void>;
};

/** One sync round: try, then retry after each delay; alert on the first failure and on giving up. */
export const syncLeadToSheets = async (lead: LeadRecord, deps: SyncDeps): Promise<SyncResult> => {
  if (!deps.config) return { sheetsStatus: 'skipped', sheetsAttempts: lead.sheetsAttempts, sheetsError: null };

  const row = leadToRow(lead);
  const sheetsAttempts = lead.sheetsAttempts + 1;
  let lastError = '';
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await deps.sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      await deps.append(deps.config, row);
      return { sheetsStatus: 'synced', sheetsAttempts, sheetsError: null };
    } catch (error) {
      lastError = (error as Error).message.slice(0, 500);
      if (error instanceof SheetsError && !error.retryable) break;
    }
  }

  const result: SyncResult = { sheetsStatus: 'failed', sheetsAttempts, sheetsError: lastError };
  if (lead.sheetsStatus !== 'failed' || sheetsAttempts >= MAX_SYNC_ROUNDS) await deps.alert(lead, result);
  return result;
};

/** What a run still owes this lead; each part stops at its own limit. */
export const pendingWork = (lead: LeadRecord, now = Date.now()) => ({
  notify:
    !lead.notifiedAt &&
    lead.notifyAttempts < MAX_NOTIFY_ATTEMPTS &&
    now - new Date(lead.createdAt).getTime() < NOTIFY_WINDOW_MS,
  sync: (lead.sheetsStatus === 'pending' || lead.sheetsStatus === 'failed') && lead.sheetsAttempts < MAX_SYNC_ROUNDS,
});

const LEAD = 'api::lead.lead';
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const adminLink = (documentId: string) =>
  process.env.PUBLIC_URL
    ? `${process.env.PUBLIC_URL}${process.env.ADMIN_PATH || '/admin'}/content-manager/collection-types/${LEAD}/${documentId}`
    : '';

const notifyRecipients = async (strapi: Core.Strapi) => {
  const setting = await strapi.documents('api::site-setting.site-setting').findFirst({ fields: ['leadNotifyEmails'] });
  const fromCms = parseEmailList(setting?.leadNotifyEmails);
  return fromCms.length ? fromCms : parseEmailList(process.env.LEAD_NOTIFY_EMAILS);
};

const summary = (lead: LeadRecord) =>
  `lead ${lead.documentId} ${lead.productType ?? 'lien-he'}:${lead.productCode ?? '-'} phone=${maskPhone(lead.phone)} email=${maskEmail(lead.email)}`;

// FR-LEAD-06. Goes only to AZway's own inboxes, so it carries the full lead.
const notify = async (strapi: Core.Strapi, lead: LeadRecord) => {
  const lines: [string, unknown][] = [
    ['Họ tên', lead.fullName],
    ['Điện thoại', lead.phone],
    ['Email', lead.email],
    ['Đơn vị', lead.organization],
    ['Ngày đi', lead.travelDate],
    ['Số người', lead.groupSize],
    ['Nhu cầu', lead.need],
    ['Ghi chú', lead.note],
    ['Sản phẩm', [lead.productType, lead.productCode, lead.productName].filter(Boolean).join(' · ')],
    ['Trang gửi', lead.sourcePage],
    ['Trang vào đầu', lead.landingPage],
    ['UTM', [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ')],
    ['Thiết bị', lead.device],
    ['Xem trong CMS', adminLink(lead.documentId)],
  ];
  return sendMail(
    {
      to: await notifyRecipients(strapi),
      subject: `[AZway] Yêu cầu mới: ${lead.productName || 'Liên hệ'} – ${lead.fullName}`,
      text: lines
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n'),
      logSummary: summary(lead),
    },
    strapi.log
  );
};

// FR-LEAD-05. No personal data: the lead stays in the CMS.
const alert = (strapi: Core.Strapi) => async (lead: LeadRecord, result: SyncResult) => {
  const givenUp = result.sheetsAttempts >= MAX_SYNC_ROUNDS;
  await sendMail(
    {
      to: parseEmailList(process.env.ALERT_EMAILS),
      subject: `[AZway] Lỗi đồng bộ Google Sheets cho yêu cầu ${lead.documentId}`,
      text: [
        `Yêu cầu ${lead.documentId} chưa ghi được vào Google Sheets sau ${result.sheetsAttempts} lượt.`,
        givenUp ? 'Đã dừng tự thử lại; cần nhập tay.' : 'Hệ thống sẽ tự thử lại mỗi 10 phút.',
        'Yêu cầu vẫn được lưu an toàn trong CMS.',
        `Lỗi: ${result.sheetsError}`,
        adminLink(lead.documentId),
      ]
        .filter(Boolean)
        .join('\n'),
      logSummary: `sheets alert lead ${lead.documentId} rounds=${result.sheetsAttempts} error=${result.sheetsError}`,
    },
    strapi.log
  );
};

// One Strapi process runs both the post-submit job and the cron (ARCHITECTURE
// D3: a single container), so an in-process set is enough to never push the
// same lead twice at once. The cron also only picks `pending` leads older
// than 5 minutes, well past one round (~13 s plus 10 s request timeouts).
const inFlight = new Set<string>();

export const processLead = async (strapi: Core.Strapi, documentId: string) => {
  if (inFlight.has(documentId)) return;
  inFlight.add(documentId);
  try {
    const lead = (await strapi.documents(LEAD).findOne({ documentId })) as unknown as LeadRecord | null;
    if (!lead) return;

    const work = pendingWork(lead);
    if (work.notify) {
      const outcome = await notify(strapi, lead);
      // Saved right away: a crash during the Sheets push must not resend the email.
      if (outcome === 'sent') await strapi.documents(LEAD).update({ documentId, data: { notifiedAt: new Date() } });
      if (outcome === 'failed') {
        const notifyAttempts = lead.notifyAttempts + 1;
        await strapi.documents(LEAD).update({ documentId, data: { notifyAttempts } });
        if (notifyAttempts === MAX_NOTIFY_ATTEMPTS) {
          strapi.log.error(`[lead] ${lead.documentId} notification email given up after ${MAX_NOTIFY_ATTEMPTS} tries`);
        }
      }
    }
    if (work.sync) {
      const result = await syncLeadToSheets(lead, {
        config: sheetsConfigFromEnv(),
        append: (config, row) => appendRow(config, row),
        sleep,
        alert: alert(strapi),
      });
      // `sheetsError: null` clears the previous error; the generated input type has no null.
      const data: Record<string, unknown> = { ...result };
      await strapi.documents(LEAD).update({ documentId, data });
      strapi.log.info(`[lead] ${lead.documentId} sheets=${result.sheetsStatus} rounds=${result.sheetsAttempts}`);
    }
  } catch (error) {
    strapi.log.error(`[lead] processing ${documentId} failed: ${(error as Error).message}`);
  } finally {
    inFlight.delete(documentId);
  }
};

// A run can outlast the cron interval (each lead may wait ~13 s per round).
let cronRunning = false;

/**
 * Cron (D10): re-push `failed` leads and `pending` ones stuck for over 5
 * minutes; resend the notification email (FR-LEAD-06) not sent after 5
 * minutes, only when Resend is configured (otherwise emails are only logged)
 * and only within NOTIFY_WINDOW_MS.
 */
export const retryDueLeads = async (strapi: Core.Strapi) => {
  if (cronRunning) return;
  cronRunning = true;
  try {
    await retryDue(strapi);
  } finally {
    cronRunning = false;
  }
};

const retryDue = async (strapi: Core.Strapi) => {
  const stuckBefore = new Date(Date.now() - 5 * 60 * 1000);
  const notifySince = new Date(Date.now() - NOTIFY_WINDOW_MS);
  const due = await strapi.documents(LEAD).findMany({
    filters: {
      $or: [
        { sheetsStatus: 'failed', sheetsAttempts: { $lt: MAX_SYNC_ROUNDS } },
        { sheetsStatus: 'pending', sheetsAttempts: { $lt: MAX_SYNC_ROUNDS }, createdAt: { $lt: stuckBefore } },
        ...(mailConfigured()
          ? [
              {
                notifiedAt: { $null: true },
                notifyAttempts: { $lt: MAX_NOTIFY_ATTEMPTS },
                createdAt: { $lt: stuckBefore, $gt: notifySince },
              },
            ]
          : []),
      ],
    },
    fields: ['documentId'],
    sort: 'createdAt:asc',
    limit: 50,
  });
  if (due.length) strapi.log.info(`[lead] cron: ${due.length} lead(s) to retry`);
  for (const { documentId } of due) await processLead(strapi, documentId);

  // FR-LEAD-06 leaves a trace when a lead ages out of the window unnotified:
  // one warning, then notifyAttempts = MAX marks it as given up.
  const expired = await strapi.documents(LEAD).findMany({
    filters: { notifiedAt: { $null: true }, notifyAttempts: { $lt: MAX_NOTIFY_ATTEMPTS }, createdAt: { $lte: notifySince } },
    fields: ['documentId'],
    limit: 50,
  });
  for (const { documentId } of expired) {
    strapi.log.warn(`[lead] ${documentId} not notified within 24h, notification given up (check RESEND_API_KEY and recipients)`);
    await strapi.documents(LEAD).update({ documentId, data: { notifyAttempts: MAX_NOTIFY_ATTEMPTS } });
  }
};
