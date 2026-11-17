// The pretend bank's card page (decision D-99). In a real gateway the customer types the card on the gateway's own
// page or SDK and the app receives a one-time token; NoWaste never sees the card (NFR-10, IF-SW-02). Here the pretend
// bank runs inside the same server for the course, mounted at POST /mock-bank/tokens. It is part of the simulated
// external service, not of NoWaste's layers, and goes away when a real sandbox gateway is used (TBD-2).
import { createHash } from 'node:crypto';
import { validateCardInput, type CardField } from '@nowaste/shared';
import { insertToken } from '../../data/mockBankRepository.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** A one-time token for a well-formed card, or the fields to fix. The card itself is not kept, only hashes. */
export async function createCardToken(
  input: Record<string, unknown>,
  now: Date,
): Promise<{ ok: true; token: string } | { ok: false; fields: CardField[] }> {
  const card = validateCardInput(input);
  if (!card.ok) return card;
  const token = await insertToken(
    {
      numberHash: sha256(card.value.number),
      cvvHash: sha256(card.value.cvv),
      expiryMonth: card.value.expiryMonth,
      expiryYear: card.value.expiryYear,
    },
    now,
  );
  return { ok: true, token };
}
