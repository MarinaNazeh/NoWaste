// US-32 vendor reservations (FR-RES-09) and US-33 pickup code at the counter (FR-RES-10, E-RES-03), decision D-101
// (planned with Maryam, 2026-11-17). The vendor opens one of their listings and sees its reservations: a number per
// listing (no personal data), the method, the status and the time (slot, hold end, "on the way"); never the pickup
// code, never a card payment still waiting for the bank. The vendor types the customer's code on that listing:
// verify shows which reservation it is, complete hands the bag over (Completed, the code is used). The code works only
// from the pickup start (and the no-card slot start) until the pickup end. Runs against nowaste_test.
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { clock } from '../src/domain/clock.js';
import { releaseExpiredHolds } from '../src/services/reservation/reservationService.js';
import { createAccount, tokenFor } from './helpers/accounts.js';
import {
  deleteAllUsers,
  insertPendingCardReservation,
  readListingRow,
  readPickupCode,
  resetMockBank,
} from './helpers/database.js';
import { createDraft, createVendor, get, post, readyToPublish } from './helpers/listings.js';

const app = createApp();
const NOW = new Date('2026-11-01T10:00:00.000Z');
const realNow = clock.now;
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const setTime = (minutes: number) => {
  clock.now = () => new Date(NOW.getTime() + minutes * 60_000);
};

let vendor: { id: string; token: string };
let listingId: string;

type Customer = { id: string; token: string };
type Row = {
  id: string;
  number: number;
  method: string;
  status: string;
  slotStart: string | null;
  holdExpiresAt: string | null;
  checkedIn: boolean;
};
type VendorView = {
  summary: {
    bagsTotal: number;
    taken: number;
    collected: number;
    waiting: number;
    notCollected: number;
    available: number;
  };
  reservations: Row[];
};

async function customer(): Promise<Customer> {
  const account = await createAccount(app, 'consumer');
  return { id: account.id, token: await tokenFor(app, account.email) };
}

/** A published listing of 3 bags; pickup from +10 to +130 minutes; slots at +10, +40, +70, +100. */
async function publishedListing(owner = vendor): Promise<string> {
  const id = await createDraft(app, owner.token, at, { bagsTotal: 3 });
  await readyToPublish(app, owner.token, id);
  const published = await post(app, `/listings/${id}/publish`, owner.token);
  if (published.status !== 200) throw new Error(`publish failed: ${JSON.stringify(published.body)}`);
  return id;
}

async function reserveNoCard(who: Customer, slot = at(10), listing = listingId) {
  const response = await post(app, '/reservations', who.token, {
    listingId: listing,
    method: 'no-card',
    slotStart: slot,
  });
  if (response.status !== 201) throw new Error(`reserve failed: ${JSON.stringify(response.body)}`);
  return response.body as { id: string; pickupCode: string | null };
}

async function reserveByCard(who: Customer, listing = listingId) {
  const card = await post(app, '/mock-bank/tokens', who.token, {
    number: '40000000',
    expiry: '12/30',
    cvv: '123',
  });
  const response = await post(app, '/reservations', who.token, {
    listingId: listing,
    method: 'card',
    paymentToken: (card.body as { token: string }).token,
  });
  if (response.status !== 201) throw new Error(`card failed: ${JSON.stringify(response.body)}`);
  return response.body as { id: string; pickupCode: string };
}

const view = async (token = vendor.token, listing = listingId) =>
  (await get(app, `/listings/${listing}/reservations`, token)).body as VendorView;
const verify = (code: unknown, listing = listingId, token = vendor.token) =>
  post(app, `/listings/${listing}/pickups/verify`, token, { code });
const complete = (code: unknown, listing = listingId, token = vendor.token) =>
  post(app, `/listings/${listing}/pickups/complete`, token, { code });

/** The code a customer sees on their reservation screen. */
async function codeOf(who: Customer, reservationId: string): Promise<string> {
  const response = await get(app, `/reservations/${reservationId}`, who.token);
  return (response.body as { pickupCode: string }).pickupCode;
}

beforeEach(async () => {
  clock.now = () => NOW;
  await deleteAllUsers();
  await resetMockBank();
  vendor = await createVendor(app);
  listingId = await publishedListing();
});

afterEach(() => {
  clock.now = realNow;
});

afterAll(async () => {
  await deleteAllUsers();
  await resetMockBank();
  await closePool();
});

describe('FR-RES-09 the vendor sees the reservations of a listing', () => {
  test('FR-RES-09 each reservation with its number, method, status and time, and the bag counts', async () => {
    const [a, b, c] = [await customer(), await customer(), await customer()];
    await reserveNoCard(a, at(10));
    await reserveByCard(b);
    await reserveNoCard(c, at(70));

    const response = await get(app, `/listings/${listingId}/reservations`, vendor.token);

    expect(response.status).toBe(200);
    const body = response.body as VendorView;
    expect(body.summary).toEqual({
      bagsTotal: 3,
      taken: 3,
      collected: 0,
      waiting: 3,
      notCollected: 0,
      available: 0,
    });
    expect(body.reservations).toMatchObject([
      {
        number: 1,
        method: 'no-card',
        status: 'Held',
        slotStart: at(10),
        holdExpiresAt: at(25),
        checkedIn: false,
      },
      { number: 2, method: 'card', status: 'Confirmed', slotStart: null, holdExpiresAt: null },
      { number: 3, method: 'no-card', status: 'Held', slotStart: at(70), holdExpiresAt: at(85) },
    ]);
  });

  test('FR-RES-09 D-101 no pickup code and no customer details are given to the vendor', async () => {
    const who = await customer();
    await reserveByCard(who);

    const [row] = (await view()).reservations;

    expect(Object.keys(row ?? {}).sort()).toEqual(
      ['checkedIn', 'holdExpiresAt', 'id', 'method', 'number', 'slotStart', 'status'].sort(),
    );
    expect(JSON.stringify(row)).not.toContain(who.id);
  });

  test('FR-RES-09 "on the way" shows when the customer checked in', async () => {
    const who = await customer();
    const reserved = await reserveNoCard(who);
    setTime(10);
    await post(app, `/reservations/${reserved.id}/checkin`, who.token);

    expect((await view()).reservations[0]).toMatchObject({ checkedIn: true, holdExpiresAt: at(35) });
  });

  test('FR-RES-09 D-100 a card payment still waiting for the bank is not shown', async () => {
    const who = await customer();
    await insertPendingCardReservation(listingId, who.id, NOW);

    expect((await view()).reservations).toEqual([]);
  });

  test('FR-RES-09 a hold that ended shows as No-show and its bag is available again', async () => {
    await reserveNoCard(await customer());
    setTime(26);

    const body = await view();

    expect(body.reservations[0]).toMatchObject({ number: 1, status: 'No-show' });
    expect(body.summary).toEqual({
      bagsTotal: 3,
      taken: 0,
      collected: 0,
      waiting: 0,
      notCollected: 0,
      available: 3,
    });
  });

  test("FR-RES-09 a vendor never sees another vendor's reservations", async () => {
    await reserveNoCard(await customer());
    const other = await createVendor(app);

    expect((await get(app, `/listings/${listingId}/reservations`, other.token)).status).toBe(404);
  });

  test('FR-RES-09 My listings and the listing show how many bags are reserved and collected', async () => {
    await reserveNoCard(await customer());

    const mine = await get(app, '/listings', vendor.token);
    const one = await get(app, `/listings/${listingId}`, vendor.token);

    const listed = (mine.body as { id: string; reservations: unknown }[]).find((l) => l.id === listingId);
    expect(listed?.reservations).toEqual({ taken: 1, collected: 0, waiting: 1, notCollected: 0 });
    expect((one.body as { reservations: unknown }).reservations).toEqual({
      taken: 1,
      collected: 0,
      waiting: 1,
      notCollected: 0,
    });
  });
});

describe('FR-RES-10 E-RES-03 the vendor types the pickup code', () => {
  test('FR-RES-10 a valid code shows which reservation it is, and changes nothing yet', async () => {
    const who = await customer();
    const reserved = await reserveByCard(who);
    setTime(10);

    const response = await verify(reserved.pickupCode);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      reservation: { id: reserved.id, number: 1, method: 'card', status: 'Confirmed' },
    });
    expect((await readPickupCode(reserved.id))?.status).toBe('Active');
  });

  test('FR-RES-10 handing over marks the reservation Completed for the vendor and the customer', async () => {
    const who = await customer();
    const reserved = await reserveByCard(who);
    setTime(10);

    const response = await complete(reserved.pickupCode);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ reservation: { id: reserved.id, status: 'Completed' } });
    expect((await readPickupCode(reserved.id))?.status).toBe('Used');
    expect((await view()).summary).toEqual({
      bagsTotal: 3,
      taken: 1,
      collected: 1,
      waiting: 0,
      notCollected: 0,
      available: 2,
    });
    const mine = await get(app, `/reservations/${reserved.id}`, who.token);
    expect(mine.body).toMatchObject({ status: 'Completed', pickupCode: null });
    const past = await get(app, '/reservations?scope=past', who.token);
    expect((past.body as { reservations: { id: string }[] }).reservations.map((r) => r.id)).toEqual([
      reserved.id,
    ]);
  });

  test('FR-RES-10 a no-card bag is handed over during its hold', async () => {
    const who = await customer();
    const reserved = await reserveNoCard(who, at(10));
    setTime(12);

    const response = await complete(await codeOf(who, reserved.id));

    expect(response.body).toMatchObject({ reservation: { method: 'no-card', status: 'Completed' } });
  });

  test('FR-RES-10 digits typed on an Arabic keyboard are accepted', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(10);
    const arabic = reserved.pickupCode.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));

    expect((await verify(arabic)).status).toBe(200);
  });

  test('E-RES-03 a wrong code is refused', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(10);
    const wrong = reserved.pickupCode === '000000' ? '000001' : '000000';

    const response = await verify(wrong);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-RES-03', reason: 'wrong_code' });
  });

  test('E-RES-03 a code of another listing is refused on this one', async () => {
    const otherListing = await publishedListing();
    const reserved = await reserveByCard(await customer(), otherListing);
    setTime(10);

    expect((await verify(reserved.pickupCode)).body).toEqual({ error: 'E-RES-03', reason: 'wrong_code' });
  });

  test('E-RES-03 a code already used is refused', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(10);
    await complete(reserved.pickupCode);

    const again = await complete(reserved.pickupCode);

    expect(again.status).toBe(409);
    expect(again.body).toEqual({ error: 'E-RES-03', reason: 'already_used' });
  });

  test('E-RES-03 the code of a hold that ended is refused', async () => {
    const who = await customer();
    const reserved = await reserveNoCard(who, at(10));
    setTime(12);
    const code = await codeOf(who, reserved.id);
    setTime(26);

    expect((await verify(code)).body).toEqual({ error: 'E-RES-03', reason: 'expired' });
  });

  test('E-RES-03 D-101 a code before the pickup starts is refused with the start time', async () => {
    const reserved = await reserveByCard(await customer());

    const response = await verify(reserved.pickupCode);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-RES-03', reason: 'not_started', startsAt: at(10) });
  });

  test('E-RES-03 D-101 a no-card code before its slot is refused with the slot start', async () => {
    const who = await customer();
    const reserved = await reserveNoCard(who, at(70));
    setTime(70);
    const code = await codeOf(who, reserved.id);
    setTime(69);

    expect((await verify(code)).body).toEqual({ error: 'E-RES-03', reason: 'not_started', startsAt: at(70) });
  });

  test('E-RES-03 D-101 a code after the pickup end is refused', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(131);

    expect((await verify(reserved.pickupCode)).body).toEqual({ error: 'E-RES-03', reason: 'ended' });
  });

  test.each([['abc'], ['12345'], ['1234567'], [undefined]])(
    'E-RES-03 a code "%s" that is not 6 digits is refused',
    async (code) => {
      const response = await verify(code);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'invalid_input', fields: ['code'] });
    },
  );

  test('FR-RES-10 another vendor cannot use a code on this listing', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(10);
    const other = await createVendor(app);

    expect((await complete(reserved.pickupCode, listingId, other.token)).status).toBe(404);
    expect((await readPickupCode(reserved.id))?.status).toBe('Active');
  });
});

// D-102 (planned with Maryam, 2026-11-17): a listing is Closed at its pickup end (the SDD lifecycle Active → Closed),
// by the worker and on every read. The counts are "taken" (waiting + collected + not collected, so they do not drop
// after a pickup), collected, waiting and not collected. A card reservation still Confirmed at the pickup end shows as
// "Not collected" to the vendor (Finished) and to the customer (Past); its status stays Confirmed until US-35.
describe('D-102 listings end at the pickup end; taken, collected, waiting and not collected', () => {
  const listing = async (id = listingId) =>
    (await get(app, `/listings/${id}`, vendor.token)).body as { status: string; reservations: unknown };

  test('D-102 a listing is Closed once its pickup end has passed', async () => {
    expect((await listing()).status).toBe('Active');

    setTime(130);

    expect((await listing()).status).toBe('Closed');
    const mine = await get(app, '/listings', vendor.token);
    expect((mine.body as { id: string; status: string }[]).find((l) => l.id === listingId)?.status).toBe(
      'Closed',
    );
  });

  test('D-102 a Fully reserved listing is Closed at the end too, and a hold ending then does not reopen it', async () => {
    const who = await customer();
    setTime(110);
    await reserveNoCard(who, at(100));
    await reserveByCard(await customer());
    await reserveByCard(await customer());
    setTime(131);

    expect((await listing()).status).toBe('Closed');
  });

  test('D-102 the worker closes ended listings', async () => {
    setTime(131);

    await releaseExpiredHolds();

    expect((await readListingRow(listingId))?.status).toBe('Closed');
  });

  test('D-102 after a pickup the bag still counts as taken', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(10);
    await complete(reserved.pickupCode);

    expect((await listing()).reservations).toEqual({ taken: 1, collected: 1, waiting: 0, notCollected: 0 });
  });

  test('D-102 a hold that ends without pickup gives its bag back, so it is no longer taken', async () => {
    await reserveNoCard(await customer(), at(10));
    setTime(26);

    expect((await listing()).reservations).toEqual({ taken: 0, collected: 0, waiting: 0, notCollected: 0 });
  });

  test('D-102 a paid bag not collected by the pickup end is counted and shown as Not collected', async () => {
    const who = await customer();
    const reserved = await reserveByCard(who);
    setTime(131);

    expect((await listing()).reservations).toEqual({ taken: 1, collected: 0, waiting: 0, notCollected: 1 });
    expect((await view()).reservations).toMatchObject([{ id: reserved.id, status: 'Not collected' }]);
    expect((await view()).summary).toMatchObject({ taken: 1, waiting: 0, notCollected: 1 });
  });

  test('D-102 the customer sees a paid bag not collected by the pickup end in Past as Not collected', async () => {
    const who = await customer();
    const reserved = await reserveByCard(who);
    setTime(131);

    const active = await get(app, '/reservations?scope=active', who.token);
    const past = await get(app, '/reservations?scope=past', who.token);
    const one = await get(app, `/reservations/${reserved.id}`, who.token);

    expect((active.body as { reservations: unknown[] }).reservations).toEqual([]);
    expect((past.body as { reservations: unknown[] }).reservations).toMatchObject([
      { id: reserved.id, status: 'Not collected', pickupCode: null },
    ]);
    expect(one.body).toMatchObject({ status: 'Not collected', pickupCode: null });
  });

  test('D-102 before the pickup end a paid bag is still waiting', async () => {
    const reserved = await reserveByCard(await customer());
    setTime(129);

    expect((await view()).reservations).toMatchObject([{ id: reserved.id, status: 'Confirmed' }]);
  });
});
