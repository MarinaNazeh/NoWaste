// FR-RES-09 (US-32), decision D-101: the vendor sees the reservations of one of their own listings: a number per
// listing, the method, the status, the slot, the hold end and "on the way". No customer details and no pickup code
// are given to the vendor; a card payment still waiting for the bank is not shown (D-100). D-102: the counts are taken,
// collected, waiting and not collected; a reservation still waiting at the pickup end shows as "Not collected".
import { clock } from '../../domain/clock.js';
import {
  NO_BAGS,
  countListingReservations,
  listListingReservations,
} from '../../data/reservationRepository.js';
import { ownListing } from '../listing/listingService.js';
import { releaseExpiredHolds } from './reservationService.js';

export interface VendorReservationsView {
  summary: {
    bagsTotal: number;
    taken: number;
    collected: number;
    waiting: number;
    notCollected: number;
    available: number;
  };
  reservations: {
    id: string;
    number: number;
    method: 'card' | 'no-card';
    status: string;
    slotStart: string | null;
    holdExpiresAt: string | null;
    checkedIn: boolean;
  }[];
}

/** GET /listings/:id/reservations: only the vendor's own listing (404 otherwise). */
export async function listingReservations(
  vendorId: string,
  listingId: string,
): Promise<VendorReservationsView> {
  await ownListing(vendorId, listingId);
  // D-93: ended holds are released first, so their bags count as available again.
  await releaseExpiredHolds();
  const listing = await ownListing(vendorId, listingId);
  const now = clock.now();
  const counts = (await countListingReservations([listing.id], now)).get(listing.id) ?? NO_BAGS;
  const rows = await listListingReservations(listing.id, now);
  return {
    summary: {
      bagsTotal: listing.bagsTotal,
      ...counts,
      available: listing.bagsAvailable,
    },
    reservations: rows.map((row) => ({
      id: row.id,
      number: row.number,
      method: row.method,
      status: row.status,
      slotStart: row.slotStart?.toISOString() ?? null,
      holdExpiresAt: row.holdExpiresAt?.toISOString() ?? null,
      checkedIn: row.checkedIn,
    })),
  };
}
