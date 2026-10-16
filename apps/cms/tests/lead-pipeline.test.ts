import { describe, expect, it, vi } from 'vitest';
import { SheetsError, type SheetsConfig } from '../src/services/google-sheets';
import {
  MAX_NOTIFY_ATTEMPTS,
  MAX_SYNC_ROUNDS,
  pendingWork,
  syncLeadToSheets,
  type LeadRecord,
  type SyncDeps,
} from '../src/services/lead-pipeline';

const config = { sheetId: 's' } as SheetsConfig;
const lead = (over: Partial<LeadRecord> = {}): LeadRecord => ({
  documentId: 'lead1',
  createdAt: '2026-10-16T09:00:00Z',
  fullName: 'A',
  phone: '0912345678',
  sheetsStatus: 'pending',
  sheetsAttempts: 0,
  notifyAttempts: 0,
  ...over,
});
const deps = (append: SyncDeps['append'], over: Partial<SyncDeps> = {}) => ({
  config,
  append: vi.fn(append),
  sleep: vi.fn(async () => {}),
  alert: vi.fn(async () => {}),
  ...over,
});

describe('syncLeadToSheets', () => {
  it('marks the lead synced when the append succeeds', async () => {
    const d = deps(async () => {});
    expect(await syncLeadToSheets(lead(), d)).toEqual({ sheetsStatus: 'synced', sheetsAttempts: 1, sheetsError: null });
    expect(d.alert).not.toHaveBeenCalled();
  });

  it('retries after 1s, 3s, 9s, then fails and alerts once', async () => {
    const d = deps(async () => {
      throw new SheetsError('append HTTP 500', true);
    });
    const result = await syncLeadToSheets(lead(), d);
    expect(result).toEqual({ sheetsStatus: 'failed', sheetsAttempts: 1, sheetsError: 'append HTTP 500' });
    expect(d.append).toHaveBeenCalledTimes(4);
    expect(d.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 3000, 9000]);
    expect(d.alert).toHaveBeenCalledTimes(1);

    // A cron round that fails again does not alert again, until the last round.
    const again = deps(d.append.getMockImplementation()!);
    await syncLeadToSheets(lead({ sheetsStatus: 'failed', sheetsAttempts: 1 }), again);
    expect(again.alert).not.toHaveBeenCalled();
    const last = deps(d.append.getMockImplementation()!);
    await syncLeadToSheets(lead({ sheetsStatus: 'failed', sheetsAttempts: MAX_SYNC_ROUNDS - 1 }), last);
    expect(last.alert).toHaveBeenCalledTimes(1);
  });

  it('does not retry an error a retry cannot fix', async () => {
    const d = deps(async () => {
      throw new SheetsError('append HTTP 403', false);
    });
    expect((await syncLeadToSheets(lead(), d)).sheetsStatus).toBe('failed');
    expect(d.append).toHaveBeenCalledTimes(1);
  });

  it('skips without Google configuration', async () => {
    const d = deps(async () => {}, { config: null });
    expect(await syncLeadToSheets(lead(), d)).toEqual({ sheetsStatus: 'skipped', sheetsAttempts: 0, sheetsError: null });
    expect(d.append).not.toHaveBeenCalled();
  });
});

describe('pendingWork', () => {
  it('retries the email and the Sheets push each up to its own limit', () => {
    expect(pendingWork(lead())).toEqual({ notify: true, sync: true });
    // Email retries must not push Sheets past its limit, and the other way round.
    expect(pendingWork(lead({ sheetsStatus: 'failed', sheetsAttempts: MAX_SYNC_ROUNDS }))).toEqual({ notify: true, sync: false });
    expect(pendingWork(lead({ sheetsStatus: 'failed', notifyAttempts: MAX_NOTIFY_ATTEMPTS }))).toEqual({ notify: false, sync: true });
    expect(pendingWork(lead({ sheetsStatus: 'synced', notifiedAt: '2026-10-16T09:00:05Z' }))).toEqual({ notify: false, sync: false });
  });
});
