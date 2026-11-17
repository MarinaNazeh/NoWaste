// Warning before the no-show block (asked for by Maryam on 2026-11-14). Pure function, no database calls.
// The numbers come from the BR-07 settings row (SRS 5.5, FR-RES-13); the caller reads the row and the customer's
// no-show times. Only no-shows inside the BR-07 window count, so a pickup in between does not reset the count.

export interface NoShowRule {
  /** BR-07: this many no-shows block no-card reserving. */
  no_shows: number;
  /** BR-07: counted within this many days. */
  within_days: number;
  /** BR-07: the block lasts this many days (used by the block in US-35, not here). */
  block_days: number;
}

/** none: nothing to show; notice: the bag went to someone else; warning: the next no-show blocks; blocked: at the limit. */
export type NoShowLevel = 'none' | 'notice' | 'warning' | 'blocked';

export interface NoShowStanding {
  level: NoShowLevel;
  /** No-shows inside the BR-07 window. */
  count: number;
  /** How many more no-shows the customer can have before the block (0 at the limit). */
  leftBeforeBlock: number;
}

const DAY = 24 * 60 * 60 * 1000;

export function noShowStanding(noShowTimes: Date[], now: Date, rule: NoShowRule): NoShowStanding {
  const from = now.getTime() - rule.within_days * DAY;
  const count = noShowTimes.filter(
    (time) => time.getTime() >= from && time.getTime() <= now.getTime(),
  ).length;
  const leftBeforeBlock = Math.max(rule.no_shows - count, 0);

  let level: NoShowLevel = 'none';
  if (count === 0) level = 'none';
  else if (leftBeforeBlock === 0) level = 'blocked';
  else if (leftBeforeBlock === 1) level = 'warning';
  else level = 'notice';

  return { level, count, leftBeforeBlock };
}
