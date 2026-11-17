// Warning before the no-show block (asked for by Maryam on 2026-11-14; not in the SRS yet, see "Document updates
// needed"). BR-07 / FR-RES-13 blocks no-card reserving after a number of no-shows within some days; the customer
// must be warned before that happens. The numbers come from the BR-07 settings row, never from code:
// - first no-shows: a notice that the bag went to someone else;
// - one no-show before the limit: a warning that the next one blocks no-card reserving;
// - at the limit: the block (the block itself and its length are built in US-35).
// Only no-shows inside the BR-07 window count.
import { noShowStanding } from '../src/domain/noShow.js';

const NOW = new Date('2026-11-14T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const BR07 = { no_shows: 3, within_days: 30, block_days: 14 };

describe('BR-07 warning before the no-show block', () => {
  test('BR-07 no no-shows gives no message', () => {
    expect(noShowStanding([], NOW, BR07)).toEqual({ level: 'none', count: 0, leftBeforeBlock: 3 });
  });

  test('BR-07 the first no-show gives a notice', () => {
    expect(noShowStanding([daysAgo(1)], NOW, BR07)).toEqual({
      level: 'notice',
      count: 1,
      leftBeforeBlock: 2,
    });
  });

  test('BR-07 one no-show before the limit gives a warning', () => {
    expect(noShowStanding([daysAgo(10), daysAgo(1)], NOW, BR07)).toEqual({
      level: 'warning',
      count: 2,
      leftBeforeBlock: 1,
    });
  });

  test('BR-07 reaching the limit gives the block level', () => {
    expect(noShowStanding([daysAgo(20), daysAgo(10), daysAgo(1)], NOW, BR07)).toEqual({
      level: 'blocked',
      count: 3,
      leftBeforeBlock: 0,
    });
  });

  test('BR-07 no-shows on different listings or in a row are counted the same: only the count in the window matters', () => {
    // A pickup between two no-shows does not reset the count (the rule is "in 30 days", not "in a row").
    expect(noShowStanding([daysAgo(29), daysAgo(2)], NOW, BR07).level).toBe('warning');
  });

  test('BR-07 a no-show older than the window is not counted', () => {
    expect(noShowStanding([daysAgo(31), daysAgo(1)], NOW, BR07)).toEqual({
      level: 'notice',
      count: 1,
      leftBeforeBlock: 2,
    });
  });

  test('BR-07 a no-show exactly at the window edge still counts', () => {
    expect(noShowStanding([daysAgo(30), daysAgo(1)], NOW, BR07).count).toBe(2);
  });

  test('BR-07 the levels follow the settings row: with a limit of 4 the warning comes at 3', () => {
    const rule = { no_shows: 4, within_days: 30, block_days: 14 };

    expect(noShowStanding([daysAgo(3), daysAgo(2)], NOW, rule).level).toBe('notice');
    expect(noShowStanding([daysAgo(3), daysAgo(2), daysAgo(1)], NOW, rule).level).toBe('warning');
  });

  test('BR-07 with a limit of 1 the first no-show blocks at once (no warning is possible)', () => {
    const rule = { no_shows: 1, within_days: 30, block_days: 14 };

    expect(noShowStanding([daysAgo(1)], NOW, rule).level).toBe('blocked');
    expect(noShowStanding([], NOW, rule).level).toBe('none');
  });
});
