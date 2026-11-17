// The bag counts of a listing (FR-RES-09, decisions D-101 to D-103), the same words on My listings and the listing's
// Reservations section. D-103: only the parts that are not zero, for example "2 of 3 bags reserved · 1 collected ·
// 1 waiting for pickup", "1 of 2 bags reserved · 1 not collected", or "No bags reserved". Reserved = waiting +
// collected + not collected, so it does not go down after a pickup; a hold that ends without pickup gives its bag back.
import type { TFunction } from 'i18next';
import type { BagCounts } from '@/api/client';

export function bagCountsText(t: TFunction, counts: BagCounts, total: number): string {
  if (counts.taken === 0) return t('myListings.countsNone');
  const parts = [t('myListings.countsReserved', { taken: counts.taken, total })];
  if (counts.collected > 0) parts.push(t('myListings.countsCollected', { count: counts.collected }));
  if (counts.waiting > 0) parts.push(t('myListings.countsWaiting', { count: counts.waiting }));
  if (counts.notCollected > 0) parts.push(t('myListings.countsNotCollected', { count: counts.notCollected }));
  return parts.join(' · ');
}

/** D-102: a listing whose pickup has ended (Closed, or a Draft whose pickup time has passed). */
export function hasEnded(listing: { status: string; pickupEnd: string }, now: number): boolean {
  return (
    listing.status === 'Closed' || listing.status === 'Cancelled' || Date.parse(listing.pickupEnd) <= now
  );
}

/** D-103: every bag was handed over: nothing left to sell and nobody still to come. */
export function isAllCollected(listing: {
  status: string;
  bagsTotal: number;
  bagsAvailable: number;
  reservations?: BagCounts;
}): boolean {
  const counts = listing.reservations;
  return (
    listing.status !== 'Draft' &&
    counts !== undefined &&
    listing.bagsAvailable === 0 &&
    counts.waiting === 0 &&
    counts.collected >= listing.bagsTotal
  );
}
