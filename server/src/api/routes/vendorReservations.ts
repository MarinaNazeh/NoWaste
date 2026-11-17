// SDD IApi: the vendor's reservations of a listing (US-32, FR-RES-09) and the pickup code at the counter (US-33,
// FR-RES-10, E-RES-03), decision D-101. The routes read the request and call the services; roles are checked by
// protectedRoutes.ts.
import type { RequestHandler } from 'express';
import { completePickupByCode, verifyPickup } from '../../services/pickup-code/pickupService.js';
import { listingReservations } from '../../services/reservation/vendorReservationService.js';
import { authOf } from '../middleware/auth.js';

const codeOf = (body: unknown): unknown =>
  typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;

/** GET /listings/:id/reservations */
export const listingReservationsHandler: RequestHandler = async (req, res) => {
  res.json(await listingReservations(authOf(res).user.id, String(req.params.id)));
};

/** POST /listings/:id/pickups/verify {code} */
export const verifyPickupHandler: RequestHandler = async (req, res) => {
  res.json(await verifyPickup(authOf(res).user.id, String(req.params.id), codeOf(req.body)));
};

/** POST /listings/:id/pickups/complete {code} */
export const completePickupHandler: RequestHandler = async (req, res) => {
  res.json(await completePickupByCode(authOf(res).user.id, String(req.params.id), codeOf(req.body)));
};
