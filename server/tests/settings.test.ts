// Checks that the first migration seeded the settings table with the exact SRS 5.5 values.
// Runs against the real nowaste_test database after `npm run migrate:test`.
import { getSetting } from '../src/data/settingsRepository.js';
import { closePool } from '../src/data/db.js';

afterAll(async () => {
  await closePool();
});

const expected: Array<[string, unknown]> = [
  ['BR-01', { highly_perishable_max_hours: 6, short_life_max_hours: 48 }],
  ['BR-02', { hold_minutes: 45 }],
  ['BR-03', { check_ins_allowed: 1, extension_minutes: 20 }],
  ['BR-04', { min_minutes_remaining: 30 }],
  ['BR-05', { accept_minutes: 10 }],
  ['BR-06', { full_refund_within_minutes: 10 }],
  ['BR-07', { no_shows: 3, within_days: 30, block_days: 14 }],
  ['BR-08', { no_shows: 3, within_days: 30 }],
  ['BR-09', { digits: 6 }],
  ['BR-10', { minutes_before_window_end: null }],
  ['BR-11', { refund: 'full' }],
  ['BR-12', { ai_draft_time_limit_seconds: 10 }],
];

describe('settings table (SRS 5.5 business rules)', () => {
  test.each(expected)('%s settings row holds the SRS 5.5 value', async (key, value) => {
    const row = await getSetting(key);

    expect(row).toBeDefined();
    expect(row?.value).toEqual(value);
    expect(row?.source).toContain(`SRS 5.5 ${key}`);
  });

  test('TBD-5 settings row exists with value null until the team decides it', async () => {
    const row = await getSetting('TBD-5');

    expect(row).toBeDefined();
    expect(row?.value).toBeNull();
  });
});
