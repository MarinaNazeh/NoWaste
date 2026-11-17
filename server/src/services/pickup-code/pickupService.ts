// C-11 Pickup Code Service, IPickupCode (SDD 3.2.1): the vendor types the customer's code on one of their listings
// (FR-RES-10, E-RES-03, US-33), decision D-101. verify shows which reservation it is and changes nothing; complete hands
// the bag over (Completed, the code Used). A code works only from the pickup start (and the no-card slot start) until
// the pickup end; a wrong, used or ended code gives 409 E-RES-03 with the reason. The digits come from BR-09.
import { parsePickupCode } from '@nowaste/shared';
import { clock } from '../../domain/clock.js';
import { SrsError } from '../../domain/errors.js';
import { completePickup, findCodeOnListing, type CodeMatch } from '../../data/reservationRepository.js';
import { getSetting } from '../../data/settingsRepository.js';
import { ownListing } from '../listing/listingService.js';
import { releaseExpiredHolds } from '../reservation/reservationService.js';

export interface PickupView {
  reservation: { id: string; number: number; method: 'card' | 'no-card'; status: string };
}

async function codeDigits(): Promise<number> {
  const value = (await getSetting('BR-09'))?.value as { digits?: unknown } | null | undefined;
  if (typeof value?.digits !== 'number') throw new Error('Settings row BR-09 is missing or invalid');
  return value.digits;
}

const refuse = (reason: string, extra: Record<string, unknown> = {}) =>
  new SrsError(409, { error: 'E-RES-03', reason, ...extra });

/** The reservation the code belongs to, if it can be handed over now; otherwise E-RES-03 with the reason. */
async function usableCode(vendorId: string, listingId: string, input: unknown): Promise<CodeMatch> {
  await ownListing(vendorId, listingId);
  const code = parsePickupCode(input, await codeDigits());
  if (code === null) throw new SrsError(400, { error: 'invalid_input', fields: ['code'] });
  // D-93: an ended hold is released (its code made void) before the code is checked.
  await releaseExpiredHolds();
  const match = await findCodeOnListing(listingId, code);
  if (match === undefined) throw refuse('wrong_code');
  if (match.codeStatus === 'Used') throw refuse('already_used');
  if (match.codeStatus === 'Void' || (match.status !== 'Held' && match.status !== 'Confirmed')) {
    throw refuse('expired');
  }
  const now = clock.now();
  const startsAt = new Date(Math.max(match.pickupStart.getTime(), match.slotStart?.getTime() ?? 0));
  if (now.getTime() < startsAt.getTime()) throw refuse('not_started', { startsAt: startsAt.toISOString() });
  if (now.getTime() > match.pickupEnd.getTime()) throw refuse('ended');
  return match;
}

const toView = (match: CodeMatch, status: string): PickupView => ({
  reservation: { id: match.reservationId, number: match.number, method: match.method, status },
});

/** POST /listings/:id/pickups/verify {code}: which reservation the code belongs to (nothing changes). */
export async function verifyPickup(vendorId: string, listingId: string, input: unknown): Promise<PickupView> {
  const match = await usableCode(vendorId, listingId, input);
  return toView(match, match.status);
}

/** POST /listings/:id/pickups/complete {code}: the bag is handed over (Completed). */
export async function completePickupByCode(
  vendorId: string,
  listingId: string,
  input: unknown,
): Promise<PickupView> {
  const match = await usableCode(vendorId, listingId, input);
  if (!(await completePickup(match.reservationId, clock.now()))) throw refuse('already_used');
  return toView(match, 'Completed');
}
