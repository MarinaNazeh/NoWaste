// Hold-time rules of a no-card reservation (FR-RES-03, FR-RES-04, E-RES-05; SDD 5.2). Pure functions, no database
// calls. The minutes come from the settings rows BR-02 and BR-03 (15 and 10 minutes, decision D-89).

const MINUTE = 60_000;

export interface HoldRule {
  /** BR-02 */
  hold_minutes: number;
}

export interface CheckInRule {
  /** BR-03 */
  check_ins_allowed: number;
  /** BR-03 */
  extension_minutes: number;
}

/** FR-RES-03: the hold ends `hold_minutes` after the later of now and the window start, never past the window end. */
export function holdEnd(now: Date, pickupStart: Date, pickupEnd: Date, rule: HoldRule): Date {
  const start = Math.max(now.getTime(), pickupStart.getTime());
  return new Date(Math.min(start + rule.hold_minutes * MINUTE, pickupEnd.getTime()));
}

/** E-RES-05: a check-in is allowed only on a Held reservation, before any check-in, and not after the hold ended. */
export function canCheckIn(
  reservation: { status: string; checkedIn: boolean; holdExpiresAt: Date | null },
  now: Date,
  rule: CheckInRule,
): boolean {
  return (
    reservation.status === 'Held' &&
    rule.check_ins_allowed > 0 &&
    !reservation.checkedIn &&
    reservation.holdExpiresAt !== null &&
    now.getTime() <= reservation.holdExpiresAt.getTime()
  );
}

/** FR-RES-04: the hold after "I'm on my way", capped at the window end. */
export function checkedInHoldEnd(holdExpiresAt: Date, pickupEnd: Date, rule: CheckInRule): Date {
  return new Date(Math.min(holdExpiresAt.getTime() + rule.extension_minutes * MINUTE, pickupEnd.getTime()));
}

/** FR-RES-05: a hold has expired once the time is past its end (at the end itself it still holds). */
export function holdExpired(holdExpiresAt: Date, now: Date): boolean {
  return now.getTime() > holdExpiresAt.getTime();
}

export interface SlotRule {
  /** PICKUP-SLOTS (D-97) */
  slot_minutes: number;
}

/**
 * D-97: the pickup slots a customer may choose now. Slots start at the pickup start and every `slot_minutes` after
 * it, each starting before the pickup end; a slot is offered until it ends (its end is capped at the pickup end), so
 * the slot we are in now is the first choice.
 */
export function pickupSlots(pickupStart: Date, pickupEnd: Date, now: Date, rule: SlotRule): Date[] {
  const step = rule.slot_minutes * MINUTE;
  const slots: Date[] = [];
  if (!(step > 0)) return slots;
  for (let start = pickupStart.getTime(); start < pickupEnd.getTime(); start += step) {
    if (Math.min(start + step, pickupEnd.getTime()) > now.getTime()) slots.push(new Date(start));
  }
  return slots;
}

/** D-97: the pickup code and "I'm on my way" are given from the slot start. */
export function slotStarted(slotStart: Date | null, now: Date): boolean {
  return slotStart === null || now.getTime() >= slotStart.getTime();
}
