// US-28 no-card hold and check-in (FR-RES-03, FR-RES-04, FR-RES-05, E-RES-05) and US-30 no over-reservation
// (FR-RES-07, E-RES-02), SDD 3.2.5.5 and 5.2. Decisions D-90 to D-93 (Maryam, 2026-11-14): one Held reservation per
// listing per customer; the 6-digit pickup code (FR-RES-10, BR-09) is made when reserving and kept as the code itself;
// an expired hold is released by the worker and also when it is read; the expiry records a no-show (FR-RES-13) and
// the customer sees the warning before the BR-07 block. The hold times are the settings rows BR-02 (15 minutes, D-89)
// and BR-03 (+10 minutes, once). Waitlist (US-29) is Sprint 3, so a released bag goes back to the listing.
// D-97 (Maryam, 2026-11-14): a no-card customer chooses a 30-minute pickup slot (settings row PICKUP-SLOTS) between the
// pickup start and end, the current slot or a later one; the 15-minute hold starts when the slot starts, and the
// pickup code and "I'm on my way" are given only from the slot start. Runs against nowaste_test.
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { getSetting } from '../src/data/settingsRepository.js';
import { clock } from '../src/domain/clock.js';
import { releaseExpiredHolds } from '../src/services/reservation/reservationService.js';
import { createAccount, tokenFor } from './helpers/accounts.js';
import {
  deleteAllUsers,
  readListingRow,
  readNoShows,
  readPickupCode,
  readReservationRow,
  readSettingValue,
  setBagsAvailable,
  setSettingValue,
} from './helpers/database.js';
import { createDraft, createVendor, get, post, readyToPublish } from './helpers/listings.js';

const app = createApp();
const NOW = new Date('2026-11-01T10:00:00.000Z');
const realNow = clock.now;
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const setTime = (minutes: number) => {
  clock.now = () => new Date(NOW.getTime() + minutes * 60_000);
};

let consumer: { id: string; token: string };
let listingId: string;
const saved: Record<string, unknown> = {};

async function newConsumer() {
  const account = await createAccount(app, 'consumer');
  return { id: account.id, token: await tokenFor(app, account.email) };
}

/** A published listing of 3 bags; pickup from now + 10 min to now + 130 min (cooked meals, 2 h shelf-life). */
async function publishedListing(bags = 3): Promise<string> {
  const vendor = await createVendor(app);
  const id = await createDraft(app, vendor.token, at, { bagsTotal: 3 });
  await readyToPublish(app, vendor.token, id);
  const published = await post(app, `/listings/${id}/publish`, vendor.token);
  if (published.status !== 200) throw new Error(`publish failed: ${JSON.stringify(published.body)}`);
  if (bags !== 3) await setBagsAvailable(id, bags);
  return id;
}

/**
 * D-97: the slot a customer reserving now would take first: slots start at the pickup start (+10) every 30 minutes
 * before the pickup end (+130), and the first one offered is the one that has not ended yet.
 */
function currentSlot(): string {
  const now = clock.now().getTime();
  for (let start = 10; start < 130; start += 30) {
    if (NOW.getTime() + Math.min(start + 30, 130) * 60_000 > now) return at(start);
  }
  return at(100);
}

const reserve = (token: string, body: Record<string, unknown> = {}) =>
  post(app, '/reservations', token, { listingId, method: 'no-card', slotStart: currentSlot(), ...body });

type Reservation = {
  id: string;
  status: string;
  method: string;
  holdExpiresAt: string | null;
  slotStart: string | null;
  checkedIn: boolean;
  pickupCode: string | null;
  listing: { id: string; nameEn: string | null; shopName: string; pickupStart: string; pickupEnd: string };
};
const body = (response: { body: unknown }) => response.body as Reservation;

beforeAll(async () => {
  for (const key of ['BR-02', 'BR-03', 'BR-07', 'PICKUP-SLOTS']) saved[key] = await readSettingValue(key);
});

beforeEach(async () => {
  clock.now = () => NOW;
  await deleteAllUsers();
  consumer = await newConsumer();
  listingId = await publishedListing();
});

afterEach(async () => {
  clock.now = realNow;
  for (const key of Object.keys(saved)) await setSettingValue(key, saved[key]);
});

afterAll(async () => {
  await deleteAllUsers();
  await closePool();
});

describe('FR-RES-03 no-card reservation and its hold', () => {
  test('FR-RES-03 reserving before the window: the hold ends 15 minutes after the window start', async () => {
    const response = await reserve(consumer.token);

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({
      status: 'Held',
      method: 'no-card',
      holdExpiresAt: at(25),
      checkedIn: false,
      listing: {
        id: listingId,
        nameEn: 'Koshari',
        shopName: 'Fatma Bakery',
        pickupStart: at(10),
        pickupEnd: at(130),
      },
    });
  });

  test('FR-RES-03 reserving inside the window: the hold ends 15 minutes after now', async () => {
    setTime(60);

    expect(body(await reserve(consumer.token)).holdExpiresAt).toBe(at(75));
  });

  test('FR-RES-03 reserving near the end: the hold never passes the window end', async () => {
    setTime(120);

    expect(body(await reserve(consumer.token)).holdExpiresAt).toBe(at(130));
  });

  test('FR-RES-03 the hold length comes from the settings row BR-02', async () => {
    await setSettingValue('BR-02', { hold_minutes: 30 });

    expect(body(await reserve(consumer.token)).holdExpiresAt).toBe(at(40));
  });

  test('FR-RES-03 reserving takes one bag, and the offer shows one bag less', async () => {
    await reserve(consumer.token);

    expect((await readListingRow(listingId))?.bags_available).toBe(2);
    const offer = await get(app, `/listings/nearby/${listingId}`, consumer.token);
    expect((offer.body as { bagsAvailable: number }).bagsAvailable).toBe(2);
  });

  test('FR-RES-03 the last bag makes the listing Fully reserved and it is no longer offered', async () => {
    await setBagsAvailable(listingId, 1);

    await reserve(consumer.token);

    expect((await readListingRow(listingId))?.status).toBe('Fully reserved');
    expect((await get(app, `/listings/nearby/${listingId}`, consumer.token)).status).toBe(404);
  });

  test('FR-RES-03 D-91 a customer cannot hold two bags of the same listing at once', async () => {
    await reserve(consumer.token);

    const second = await reserve(consumer.token);

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'already_reserved' });
    expect((await readListingRow(listingId))?.bags_available).toBe(2);
  });

  test('FR-RES-03 D-91 after the hold expired the customer may reserve the same listing again', async () => {
    await reserve(consumer.token);
    setTime(26);

    expect((await reserve(consumer.token)).status).toBe(201);
  });

  test('FR-RES-03 NFR-15 the same request sent twice (same idempotency key) makes one reservation', async () => {
    const first = await reserve(consumer.token, { idempotencyKey: 'tap-1' });
    const again = await reserve(consumer.token, { idempotencyKey: 'tap-1' });

    expect(again.status).toBe(200);
    expect(body(again).id).toBe(body(first).id);
    expect((await readListingRow(listingId))?.bags_available).toBe(2);
  });

  // D-99: card reservations exist since US-27 (tests in cardReservation.test.ts); any other method is refused.
  test('FR-RES-03 the method must be no-card or card', async () => {
    const response = await reserve(consumer.token, { method: 'cash' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_reservation', fields: ['method'] });
  });

  test('FR-RES-03 a missing or wrong listing id is refused', async () => {
    const missing = await post(app, '/reservations', consumer.token, { method: 'no-card' });
    expect(missing.status).toBe(400);
    // D-97: the request has no pickup slot either.
    expect(missing.body).toEqual({ error: 'invalid_reservation', fields: ['listingId', 'slotStart'] });

    const unknown = await reserve(consumer.token, { listingId: '00000000-0000-0000-0000-000000000000' });
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ error: 'not_found' });
  });

  test('FR-RES-03 a listing whose pickup has ended cannot be reserved', async () => {
    setTime(130);

    expect((await reserve(consumer.token)).status).toBe(404);
  });
});

describe('FR-RES-10 D-92 the pickup code', () => {
  test('FR-RES-10 a reservation gets a 6-digit pickup code (BR-09), kept so it can be shown again', async () => {
    setTime(10);
    const reserved = body(await reserve(consumer.token));

    expect(reserved.pickupCode).toMatch(/^\d{6}$/);
    expect(await readPickupCode(reserved.id)).toEqual({ code: reserved.pickupCode, status: 'Active' });
    const again = await get(app, `/reservations/${reserved.id}`, consumer.token);
    expect(body(again).pickupCode).toBe(reserved.pickupCode);
  });
});

describe('FR-RES-07 E-RES-02 no over-reservation', () => {
  test('E-RES-02 when the last bag is taken, the next customer is refused', async () => {
    await setBagsAvailable(listingId, 1);
    await reserve(consumer.token);
    const other = await newConsumer();

    const response = await reserve(other.token);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-RES-02' });
  });

  test('FR-RES-07 eight customers reserve the last bag at the same moment: only one succeeds', async () => {
    await setBagsAvailable(listingId, 1);
    const others = [];
    for (let i = 0; i < 8; i += 1) others.push(await newConsumer());

    const responses = await Promise.all(others.map((other) => reserve(other.token)));

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(
      responses.filter((r) => r.status === 409 && (r.body as { error: string }).error === 'E-RES-02'),
    ).toHaveLength(7);
    expect((await readListingRow(listingId))?.bags_available).toBe(0);
  });

  test('FR-RES-07 ten customers reserve 3 bags at the same moment: exactly 3 succeed', async () => {
    const others = [];
    for (let i = 0; i < 10; i += 1) others.push(await newConsumer());

    const responses = await Promise.all(others.map((other) => reserve(other.token)));

    expect(responses.filter((r) => r.status === 201)).toHaveLength(3);
    expect((await readListingRow(listingId))?.bags_available).toBe(0);
  });
});

describe('FR-RES-04 "I\'m on my way" check-in', () => {
  const checkIn = (id: string, token = consumer.token) => post(app, `/reservations/${id}/checkin`, token);

  test('FR-RES-04 the check-in adds 10 minutes once', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(10);

    const response = await checkIn(reserved.id);

    expect(response.status).toBe(200);
    expect(body(response)).toMatchObject({ status: 'Held', holdExpiresAt: at(35), checkedIn: true });
  });

  test('FR-RES-04 the extension is capped at the window end', async () => {
    setTime(110);
    const reserved = body(await reserve(consumer.token));
    expect(reserved.holdExpiresAt).toBe(at(125));

    expect(body(await checkIn(reserved.id)).holdExpiresAt).toBe(at(130));
  });

  test('FR-RES-04 the extension comes from the settings row BR-03', async () => {
    await setSettingValue('BR-03', { check_ins_allowed: 1, extension_minutes: 5 });
    const reserved = body(await reserve(consumer.token));
    setTime(10);

    expect(body(await checkIn(reserved.id)).holdExpiresAt).toBe(at(30));
  });

  test('FR-RES-04 a check-in exactly at the hold end is still accepted', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(25);

    expect((await checkIn(reserved.id)).status).toBe(200);
  });

  test('E-RES-05 a second check-in is refused', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(10);
    await checkIn(reserved.id);

    const second = await checkIn(reserved.id);

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'E-RES-05' });
    expect((await readReservationRow(reserved.id))?.hold_expires_at).toEqual(new Date(at(35)));
  });

  test('E-RES-05 a check-in after the hold expired is refused and the reservation is released', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(26);

    const response = await checkIn(reserved.id);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-RES-05' });
    expect((await readReservationRow(reserved.id))?.status).toBe('No-show');
  });

  test("FR-RES-04 a customer cannot check in to someone else's reservation", async () => {
    const reserved = body(await reserve(consumer.token));
    const other = await newConsumer();

    expect((await checkIn(reserved.id, other.token)).status).toBe(404);
    expect((await get(app, `/reservations/${reserved.id}`, other.token)).status).toBe(404);
  });
});

describe('FR-RES-05 release when the hold expires', () => {
  test('FR-RES-05 an expired hold is released: No-show, the bag goes back, the pickup code is void', async () => {
    await setBagsAvailable(listingId, 1);
    const reserved = body(await reserve(consumer.token));
    setTime(26);

    expect(await releaseExpiredHolds()).toBe(1);

    expect((await readReservationRow(reserved.id))?.status).toBe('No-show');
    const listing = await readListingRow(listingId);
    expect(listing?.bags_available).toBe(1);
    expect(listing?.status).toBe('Active');
    expect((await readPickupCode(reserved.id))?.status).toBe('Void');
  });

  test('FR-RES-05 a hold is not released at its end time, only after it', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(25);

    expect(await releaseExpiredHolds()).toBe(0);
    expect((await readReservationRow(reserved.id))?.status).toBe('Held');
  });

  test('FR-RES-05 releasing twice gives the bag back once (a worker restart repeats nothing)', async () => {
    await reserve(consumer.token);
    setTime(26);

    await releaseExpiredHolds();
    expect(await releaseExpiredHolds()).toBe(0);

    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });

  test('FR-RES-05 D-93 reading an expired reservation releases it without waiting for the worker', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(26);

    const response = await get(app, `/reservations/${reserved.id}`, consumer.token);

    expect(body(response)).toMatchObject({ status: 'No-show', pickupCode: null });
    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });

  test('FR-RES-13 the expiry records one no-show, from an expired no-card hold', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(26);

    await releaseExpiredHolds();
    await releaseExpiredHolds();

    expect(await readNoShows(consumer.id)).toEqual([
      { reservationId: reserved.id, source: 'hold expired', method: 'no-card' },
    ]);
  });

  test('FR-RES-05 the worker checks every minute: the settings row C-19 holds 60 seconds', async () => {
    expect((await getSetting('C-19'))?.value).toEqual({ poll_seconds: 60 });
  });
});

describe('BR-07 the customer is warned before the no-show block', () => {
  const standing = (token = consumer.token) => get(app, '/reservations/no-show-standing', token);

  test('BR-07 with no no-shows there is nothing to show, with the BR-07 numbers', async () => {
    const response = await standing();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      level: 'none',
      count: 0,
      leftBeforeBlock: 3,
      limit: 3,
      withinDays: 30,
      blockDays: 14,
    });
  });

  test('BR-07 after one expired hold the customer gets the notice, after two the warning', async () => {
    await reserve(consumer.token);
    setTime(26);
    expect((await standing()).body).toMatchObject({ level: 'notice', count: 1, leftBeforeBlock: 2 });

    await reserve(consumer.token);
    setTime(60);
    expect((await standing()).body).toMatchObject({ level: 'warning', count: 2, leftBeforeBlock: 1 });
  });
});

describe('FR-RES-08 D-94 my active and past reservations', () => {
  const list = (scope: string, token = consumer.token) => get(app, `/reservations?scope=${scope}`, token);
  const ids = (response: { body: unknown }) =>
    (response.body as { reservations: Reservation[] }).reservations.map((r) => r.id);

  test('FR-RES-08 active lists the held reservations, the soonest hold end first, with the pickup code', async () => {
    const later = body(await reserve(consumer.token));
    // The second hold is made after the first but ends sooner (5-minute hold: +15, before +25).
    await setSettingValue('BR-02', { hold_minutes: 5 });
    listingId = await publishedListing();
    const sooner = body(await reserve(consumer.token));

    setTime(10);
    const response = await list('active');

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual([sooner.id, later.id]);
    expect((response.body as { reservations: Reservation[] }).reservations[0]?.pickupCode).toMatch(/^\d{6}$/);
  });

  test('FR-RES-08 an ended hold moves from active to past', async () => {
    const reserved = body(await reserve(consumer.token));
    setTime(26);

    expect(ids(await list('active'))).toEqual([]);
    const past = await list('past');
    expect(ids(past)).toEqual([reserved.id]);
    expect((past.body as { reservations: Reservation[] }).reservations[0]).toMatchObject({
      status: 'No-show',
      pickupCode: null,
    });
  });

  test('FR-RES-08 past shows the newest first', async () => {
    const first = body(await reserve(consumer.token));
    setTime(26);
    const second = body(await reserve(consumer.token));
    setTime(60);

    expect(ids(await list('past'))).toEqual([second.id, first.id]);
  });

  test('FR-RES-08 a customer sees only their own reservations', async () => {
    await reserve(consumer.token);
    const other = await newConsumer();

    expect(ids(await list('active', other.token))).toEqual([]);
  });

  test('FR-RES-08 the list must be active or past', async () => {
    const response = await list('all');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_input', fields: ['scope'] });
  });
});

describe('D-97 FR-RES-03 the customer chooses a pickup slot', () => {
  const offer = async () =>
    (await get(app, `/listings/nearby/${listingId}`, consumer.token)).body as { pickupSlots: string[] };

  test('D-97 the settings row PICKUP-SLOTS holds 30-minute slots', async () => {
    expect((await getSetting('PICKUP-SLOTS'))?.value).toEqual({ slot_minutes: 30 });
  });

  test('D-97 the offer lists the 30-minute slots from the pickup start, each starting before the end', async () => {
    expect((await offer()).pickupSlots).toEqual([at(10), at(40), at(70), at(100)]);
  });

  test('D-97 the current slot is still offered, ended slots are not', async () => {
    setTime(45);
    expect((await offer()).pickupSlots).toEqual([at(40), at(70), at(100)]);

    setTime(125);
    expect((await offer()).pickupSlots).toEqual([at(100)]);
  });

  test('D-97 the slot length comes from the settings row', async () => {
    await setSettingValue('PICKUP-SLOTS', { slot_minutes: 60 });

    expect((await offer()).pickupSlots).toEqual([at(10), at(70)]);
  });

  test('D-97 FR-RES-03 a later slot: the 15-minute hold starts at the slot start', async () => {
    const response = await reserve(consumer.token, { slotStart: at(70) });

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({ status: 'Held', slotStart: at(70), holdExpiresAt: at(85) });
  });

  test('D-97 FR-RES-03 the current slot: the hold starts now, and never passes the pickup end', async () => {
    setTime(50);
    expect(body(await reserve(consumer.token, { slotStart: at(40) })).holdExpiresAt).toBe(at(65));

    setTime(125);
    const other = await newConsumer();
    expect(body(await reserve(other.token, { slotStart: at(100) })).holdExpiresAt).toBe(at(130));
  });

  test.each([
    ['missing', undefined],
    ['not a slot start', at(20)],
    ['after the pickup end', at(130)],
    ['not a time', 'soon'],
  ])('D-97 a slot that is %s is refused', async (_case, slotStart) => {
    const response = await reserve(consumer.token, { slotStart });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_reservation', fields: ['slotStart'] });
    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });

  test('D-97 a slot that has already ended is refused', async () => {
    setTime(45);

    const response = await reserve(consumer.token, { slotStart: at(10) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_reservation', fields: ['slotStart'] });
  });

  test('D-97 before the slot starts the pickup code is not shown; from the slot start it is', async () => {
    const reserved = body(await reserve(consumer.token, { slotStart: at(70) }));
    expect(reserved.pickupCode).toBeNull();

    setTime(69);
    expect(body(await get(app, `/reservations/${reserved.id}`, consumer.token)).pickupCode).toBeNull();

    setTime(70);
    expect(body(await get(app, `/reservations/${reserved.id}`, consumer.token)).pickupCode).toMatch(
      /^\d{6}$/,
    );
  });

  test('D-97 "I\'m on my way" is refused before the slot starts', async () => {
    const reserved = body(await reserve(consumer.token, { slotStart: at(70) }));
    setTime(69);

    const response = await post(app, `/reservations/${reserved.id}/checkin`, consumer.token);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'slot_not_started' });
    setTime(70);
    expect(body(await post(app, `/reservations/${reserved.id}/checkin`, consumer.token)).holdExpiresAt).toBe(
      at(95),
    );
  });

  test('D-97 FR-RES-05 a hold in a later slot is not released before its slot', async () => {
    const reserved = body(await reserve(consumer.token, { slotStart: at(70) }));
    setTime(60);

    expect(await releaseExpiredHolds()).toBe(0);
    expect((await readReservationRow(reserved.id))?.status).toBe('Held');
  });
});
