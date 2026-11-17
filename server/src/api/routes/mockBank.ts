// POST /mock-bank/tokens {number, expiry: "MM/YY", cvv}: the pretend bank's card page (decision D-99). It stands in for
// the payment gateway's own page, so the card never reaches NoWaste (NFR-10, IF-SW-02): the app gets a one-time token
// and sends only that to POST /reservations. 201 {token}; 400 {"error":"invalid_card","fields":[...]}.
import type { RequestHandler } from 'express';
import { createCardToken } from '../../adapters/payment-gateway/mockBankCardPage.js';
import { clock } from '../../domain/clock.js';
import { SrsError } from '../../domain/errors.js';

export const createCardTokenHandler: RequestHandler = async (req, res) => {
  const body: unknown = req.body;
  const result = await createCardToken(
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {},
    clock.now(),
  );
  if (!result.ok) throw new SrsError(400, { error: 'invalid_card', fields: result.fields });
  res.status(201).json({ token: result.token });
};
