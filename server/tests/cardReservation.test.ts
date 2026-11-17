// US-27 card reservation (FR-RES-02, E-RES-01, E-RES-02, NFR-10, IF-SW-02, IF-SW-03) with the pretend bank of decision
// D-99 (Maryam, 2026-11-16). The pretend bank stands in for the payment gateway's sandbox: the app sends the card
// (8-digit number, MM/YY, CVV) to POST /mock-bank/tokens and gets a one-time token; NoWaste receives only the token,
// charges it through the Payment Gateway Adapter and keeps only the result and the reference, never card data.
// A card reservation takes the bag (row lock), is Pending payment while the bank answers, and is Confirmed only when
// the bank approves; the pickup code is shown at once and is valid for the whole window (no hold, no slot). Any failure
// (unknown card, wrong expiry or CVV, expired, blocked, not enough money, no answer within PAYMENT-TIMEOUT) gives
// 402 E-RES-01 with the reason: no reservation is kept and the bag is available again. Runs against nowaste_test.
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { getSetting } from '../src/data/settingsRepository.js';
import { clock } from '../src/domain/clock.js';
import { releaseExpiredHolds } from '../src/services/reservation/reservationService.js';
import { createAccount, tokenFor } from './helpers/accounts.js';
import {
  countReservations,
  deleteAllUsers,
  insertPendingCardReservation,
  nowasteTablesContain,
  readListingRow,
  readMockBankBalance,
  readPayments,
  readSettingValue,
  resetMockBank,
  setBagsAvailable,
  setSettingValue,
} from './helpers/database.js';
import { createDraft, createVendor, get, post, readyToPublish } from './helpers/listings.js';

const app = createApp();
const NOW = new Date('2026-11-01T10:00:00.000Z');
const realNow = clock.now;
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
// The listing helper's price (EGP).
const PRICE = 40;

// The pretend bank's test cards (docs/test-cards.md), seeded by migration 1794258000000_create-mock-bank.
const GOOD = { number: '40000000', expiry: '12/30', cvv: '123' };
const GOOD_BALANCE = 10000;

let consumer: { id: string; token: string };
let listingId: string;
let savedTimeout: unknown;

async function newConsumer() {
  const account = await createAccount(app, 'consumer');
  return { id: account.id, token: await tokenFor(app, account.email) };
}

async function publishedListing(): Promise<string> {
  const vendor = await createVendor(app);
  const id = await createDraft(app, vendor.token, at, { bagsTotal: 3 });
  await readyToPublish(app, vendor.token, id);
  const published = await post(app, `/listings/${id}/publish`, vendor.token);
  if (published.status !== 200) throw new Error(`publish failed: ${JSON.stringify(published.body)}`);
  return id;
}

/** The app's first step: the card goes to the pretend bank, which answers with a one-time token. */
async function cardToken(card: Record<string, unknown> = GOOD, token = consumer.token): Promise<string> {
  const response = await post(app, '/mock-bank/tokens', token, card);
  if (response.status !== 201) throw new Error(`token failed: ${JSON.stringify(response.body)}`);
  return (response.body as { token: string }).token;
}

const payByCard = (paymentToken: string, token = consumer.token, extra: Record<string, unknown> = {}) =>
  post(app, '/reservations', token, { listingId, method: 'card', paymentToken, ...extra });

type Reservation = {
  id: string;
  method: string;
  status: string;
  holdExpiresAt: string | null;
  slotStart: string | null;
  pickupCode: string | null;
};
const body = (response: { body: unknown }) => response.body as Reservation;

beforeAll(async () => {
  savedTimeout = await readSettingValue('PAYMENT-TIMEOUT');
});

beforeEach(async () => {
  clock.now = () => NOW;
  await deleteAllUsers();
  await resetMockBank();
  consumer = await newConsumer();
  listingId = await publishedListing();
});

afterEach(async () => {
  clock.now = realNow;
  await setSettingValue('PAYMENT-TIMEOUT', savedTimeout);
});

afterAll(async () => {
  await deleteAllUsers();
  await resetMockBank();
  await closePool();
});

describe('D-99 the pretend bank takes the card and gives a one-time token', () => {
  test('D-99 a well-formed card gives a token', async () => {
    const response = await post(app, '/mock-bank/tokens', consumer.token, GOOD);

    expect(response.status).toBe(201);
    expect((response.body as { token: string }).token).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('E-RES-01 a badly formed card is refused with the fields to fix', async () => {
    const response = await post(app, '/mock-bank/tokens', consumer.token, {
      number: '1234',
      expiry: '13/30',
      cvv: '1',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_card', fields: ['number', 'expiry', 'cvv'] });
  });

  test('NFR-10 the pretend bank keeps the card number and CVV only as hashes', async () => {
    await cardToken();

    expect(await readMockBankBalance(GOOD.number)).toBe(GOOD_BALANCE);
  });
});

describe('FR-RES-02 pay by card', () => {
  test('FR-RES-02 an approved card confirms the reservation at once, with the pickup code and no hold', async () => {
    const response = await payByCard(await cardToken());

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({
      method: 'card',
      status: 'Confirmed',
      holdExpiresAt: null,
      slotStart: null,
    });
    // The pickup has not started yet (+10), but the code is shown at once and is valid for the whole window.
    expect(body(response).pickupCode).toMatch(/^\d{6}$/);
  });

  test('FR-RES-02 the full price is taken from the card and kept as an Approved payment', async () => {
    const reserved = body(await payByCard(await cardToken()));

    expect(await readMockBankBalance(GOOD.number)).toBe(GOOD_BALANCE - PRICE);
    const payments = await readPayments(reserved.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: PRICE, status: 'Approved' });
    expect(payments[0]?.gatewayReference).toMatch(/\S+/);
  });

  test('FR-RES-02 one bag is taken; the last bag makes the listing Fully reserved', async () => {
    await setBagsAvailable(listingId, 1);

    await payByCard(await cardToken());

    const listing = await readListingRow(listingId);
    expect(listing?.bags_available).toBe(0);
    expect(listing?.status).toBe('Fully reserved');
  });

  test('NFR-10 IF-SW-02 no card number, expiry or CVV reaches the NoWaste reservation and payment tables', async () => {
    await payByCard(await cardToken());

    expect(await nowasteTablesContain(GOOD.number)).toBe(false);
    expect(await nowasteTablesContain('12/30')).toBe(false);
  });

  test('FR-RES-02 a card reservation is not released by the worker: it is held for the whole window', async () => {
    const reserved = body(await payByCard(await cardToken()));
    clock.now = () => new Date(NOW.getTime() + 120 * 60_000);

    await releaseExpiredHolds();

    expect(body(await get(app, `/reservations/${reserved.id}`, consumer.token)).status).toBe('Confirmed');
  });

  test('FR-RES-08 a confirmed card reservation is in the active list', async () => {
    const reserved = body(await payByCard(await cardToken()));

    const list = await get(app, '/reservations?scope=active', consumer.token);

    expect((list.body as { reservations: Reservation[] }).reservations.map((r) => r.id)).toEqual([
      reserved.id,
    ]);
  });

  test('NFR-15 the same request sent twice (same idempotency key) charges the card once', async () => {
    const paymentToken = await cardToken();

    const first = await payByCard(paymentToken, consumer.token, { idempotencyKey: 'card-tap' });
    const again = await payByCard(paymentToken, consumer.token, { idempotencyKey: 'card-tap' });

    expect(again.status).toBe(200);
    expect(body(again).id).toBe(body(first).id);
    expect(await readMockBankBalance(GOOD.number)).toBe(GOOD_BALANCE - PRICE);
  });

  test('FR-RES-02 a missing or malformed payment token is refused before anything is reserved', async () => {
    const response = await post(app, '/reservations', consumer.token, { listingId, method: 'card' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_reservation', fields: ['paymentToken'] });
    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });

  test('IF-SW-03 the settings row PAYMENT-TIMEOUT gives the bank 60 seconds to answer', async () => {
    expect((await getSetting('PAYMENT-TIMEOUT'))?.value).toEqual({ seconds: 60 });
  });
});

describe('E-RES-01 a failed payment keeps no reservation and the bag stays available', () => {
  test.each([
    ['an unknown card', { number: '41111111', expiry: '12/30', cvv: '123' }, 'unknown_card'],
    ['a wrong CVV', { number: '40000000', expiry: '12/30', cvv: '999' }, 'wrong_details'],
    ['a wrong expiry', { number: '40000000', expiry: '11/30', cvv: '123' }, 'wrong_details'],
    ['an expired card', { number: '40000004', expiry: '10/26', cvv: '123' }, 'expired_card'],
    ['a blocked card', { number: '40000002', expiry: '12/30', cvv: '123' }, 'declined'],
    ['not enough money', { number: '40000003', expiry: '12/30', cvv: '123' }, 'insufficient_funds'],
  ])('E-RES-01 %s', async (_case, card, reason) => {
    const response = await payByCard(await cardToken(card));

    expect(response.status).toBe(402);
    expect(response.body).toEqual({ error: 'E-RES-01', reason });
    expect(await countReservations(listingId)).toBe(0);
    const listing = await readListingRow(listingId);
    expect(listing?.bags_available).toBe(3);
    expect(listing?.status).toBe('Active');
  });

  test('E-RES-01 a declined card on the last bag gives the bag back (Fully reserved again Active)', async () => {
    await setBagsAvailable(listingId, 1);

    await payByCard(await cardToken({ number: '40000002', expiry: '12/30', cvv: '123' }));

    const listing = await readListingRow(listingId);
    expect(listing?.bags_available).toBe(1);
    expect(listing?.status).toBe('Active');
  });

  test('E-RES-01 IF-SW-03 no answer within PAYMENT-TIMEOUT counts as failed', async () => {
    await setSettingValue('PAYMENT-TIMEOUT', { seconds: 0.3 });

    const response = await payByCard(await cardToken({ number: '40000005', expiry: '12/30', cvv: '123' }));

    expect(response.status).toBe(402);
    expect(response.body).toEqual({ error: 'E-RES-01', reason: 'timeout' });
    expect(await countReservations(listingId)).toBe(0);
    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });

  test('E-RES-01 a token can be used once only', async () => {
    const paymentToken = await cardToken();
    await payByCard(paymentToken);
    listingId = await publishedListing();

    const again = await payByCard(paymentToken);

    expect(again.status).toBe(402);
    expect(again.body).toEqual({ error: 'E-RES-01', reason: 'invalid_token' });
  });

  test('E-RES-01 a token that the bank never gave is refused', async () => {
    const response = await payByCard('00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(402);
    expect(response.body).toEqual({ error: 'E-RES-01', reason: 'invalid_token' });
  });

  test('E-RES-02 when no bag is left the card is not charged', async () => {
    await setBagsAvailable(listingId, 0);

    const response = await payByCard(await cardToken());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-RES-02' });
    expect(await readMockBankBalance(GOOD.number)).toBe(GOOD_BALANCE);
  });

  test('FR-RES-07 two customers pay for the last bag at the same moment: one is charged, one gets E-RES-02', async () => {
    await setBagsAvailable(listingId, 1);
    const other = await newConsumer();
    const tokens = [
      await cardToken(),
      await cardToken({ number: '40000001', expiry: '12/30', cvv: '123' }, other.token),
    ];

    const responses = await Promise.all([
      payByCard(tokens[0] ?? ''),
      payByCard(tokens[1] ?? '', other.token),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const left = [await readMockBankBalance('40000000'), await readMockBankBalance('40000001')];
    expect(left.map((balance) => GOOD_BALANCE - (balance ?? 0)).sort((a, b) => a - b)).toEqual([0, PRICE]);
  });

  test('E-RES-01 a payment left unanswered (for example after a crash) is released by the worker', async () => {
    const stale = new Date(NOW.getTime() - 5 * 60_000);
    await insertPendingCardReservation(listingId, consumer.id, stale);
    expect((await readListingRow(listingId))?.bags_available).toBe(2);

    await releaseExpiredHolds();

    expect(await countReservations(listingId)).toBe(0);
    expect((await readListingRow(listingId))?.bags_available).toBe(3);
  });
});

// Bug found by Maryam on the phone (2026-11-17): a card reservation still waiting for the bank appeared in Active
// reservations as "Waiting for payment" and opened as "No longer available" once the payment failed. A reservation is
// shown to the customer only once it is Confirmed (D-100).
describe('FR-RES-08 D-100 a card reservation is shown only once the payment is confirmed', () => {
  test('FR-RES-08 a reservation waiting for the bank is not in the active or past list', async () => {
    await insertPendingCardReservation(listingId, consumer.id, NOW);

    const active = await get(app, '/reservations?scope=active', consumer.token);
    const past = await get(app, '/reservations?scope=past', consumer.token);

    expect((active.body as { reservations: unknown[] }).reservations).toEqual([]);
    expect((past.body as { reservations: unknown[] }).reservations).toEqual([]);
  });

  test('FR-RES-08 a reservation waiting for the bank cannot be opened', async () => {
    const id = await insertPendingCardReservation(listingId, consumer.id, NOW);

    expect((await get(app, `/reservations/${id}`, consumer.token)).status).toBe(404);
  });

  test('E-RES-01 a failed payment leaves nothing in the lists', async () => {
    await payByCard(await cardToken({ number: '40000002', expiry: '12/30', cvv: '123' }));

    const active = await get(app, '/reservations?scope=active', consumer.token);
    const past = await get(app, '/reservations?scope=past', consumer.token);

    expect((active.body as { reservations: unknown[] }).reservations).toEqual([]);
    expect((past.body as { reservations: unknown[] }).reservations).toEqual([]);
  });

  test('FR-RES-08 once approved the card reservation is in the active list as Confirmed', async () => {
    const reserved = body(await payByCard(await cardToken()));

    const active = await get(app, '/reservations?scope=active', consumer.token);

    expect((active.body as { reservations: Reservation[] }).reservations).toMatchObject([
      { id: reserved.id, status: 'Confirmed' },
    ]);
  });
});
