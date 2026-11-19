// D-105 (Maryam, 2026-11-17): the administrator gives a reason when rejecting an application (a reason from a list and
// an optional note, required for Other); the applicant sees it with the support contact (settings row SUPPORT-CONTACT)
// and may fix the whole application and send it again, which makes it Pending again (Rejected -> Pending, by the
// applicant only, no limit). The administrator sees the last rejection on a reapplication.
// Routes: POST /admin/applications/:userId/reject {reason, note}, GET and POST /users/me/application.
import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { getSetting } from '../src/data/settingsRepository.js';
import { createAccount, tokenFor, type TestAccount } from './helpers/accounts.js';
import { deleteAllUsers, readUserStatus } from './helpers/database.js';

const app = createApp();
let adminToken: string;

function reject(userId: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/admin/applications/${userId}/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body);
}

function list(status: string) {
  return request(app)
    .get(`/admin/applications?status=${status}`)
    .set('Authorization', `Bearer ${adminToken}`);
}

const myApplication = (token: string) =>
  request(app).get('/users/me/application').set('Authorization', `Bearer ${token}`);

const sendAgain = (token: string, body: Record<string, unknown>) =>
  request(app).post('/users/me/application').set('Authorization', `Bearer ${token}`).send(body);

const fixedVendor = {
  shopName: 'Fatma Bakery Dokki',
  vendorType: 'informal',
  address: '14 Tahrir Street, Dokki, Giza',
  latitude: 30.039,
  longitude: 31.213,
  contact: '01098765432',
  description: 'Fresh bread every morning',
  opensAt: '08:00',
  closesAt: '22:00',
  branches: [
    {
      address: '3 Road 9, Maadi, Cairo',
      latitude: 29.96,
      longitude: 31.25,
      opensAt: '09:00',
      closesAt: '21:00',
    },
  ],
};

const fixedPartner = {
  organisationName: 'Giza Mosque Kitchen',
  address: '7 Nile Corniche, Giza',
  latitude: 30.014,
  longitude: 31.21,
  acceptedFoodTypes: ['cooked_meals', 'bread_and_baked_goods'],
  otherPartnerType: 'Mosque',
};

async function rejectedVendor(): Promise<TestAccount & { token: string }> {
  const vendor = await createAccount(app, 'vendor');
  await reject(vendor.id, { reason: 'wrong_location', note: 'The pin is in the Nile.' });
  return { ...vendor, token: await tokenFor(app, vendor.email) };
}

beforeEach(async () => {
  await deleteAllUsers();
  const admin = await createAccount(app, 'admin');
  adminToken = await tokenFor(app, admin.email);
});

afterAll(async () => {
  await deleteAllUsers();
  await closePool();
});

describe('FR-ACC-07 D-105 the administrator gives a reason when rejecting', () => {
  test('FR-ACC-07 D-105 rejecting without a reason is refused and the applicant stays Pending', async () => {
    const vendor = await createAccount(app, 'vendor');

    const response = await reject(vendor.id, {});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_input', fields: ['reason'] });
    expect(await readUserStatus(vendor.id)).toBe('Pending');
  });

  test('FR-ACC-07 D-105 a reason that is not on the list is refused', async () => {
    const vendor = await createAccount(app, 'vendor');

    const response = await reject(vendor.id, { reason: 'ugly_logo' });

    expect(response.body).toEqual({ error: 'invalid_input', fields: ['reason'] });
  });

  test('FR-ACC-07 D-105 Other needs a note', async () => {
    const vendor = await createAccount(app, 'vendor');

    const response = await reject(vendor.id, { reason: 'other', note: '   ' });

    expect(response.body).toEqual({ error: 'invalid_input', fields: ['note'] });
    expect(await readUserStatus(vendor.id)).toBe('Pending');
  });

  test('FR-ACC-07 D-105 a note longer than 300 characters is refused', async () => {
    const vendor = await createAccount(app, 'vendor');

    const response = await reject(vendor.id, { reason: 'wrong_contact', note: 'x'.repeat(301) });

    expect(response.body).toEqual({ error: 'invalid_input', fields: ['note'] });
  });

  test('FR-ACC-07 D-105 the reason and note are saved and shown on the Rejected list', async () => {
    const partner = await createAccount(app, 'partner');

    const response = await reject(partner.id, { reason: 'not_food_business', note: '  Sells clothes.  ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: partner.id, status: 'Rejected' });
    const [item] = (await list('Rejected')).body as Record<string, unknown>[];
    expect(item).toMatchObject({
      userId: partner.id,
      lastRejection: { reason: 'not_food_business', note: 'Sells clothes.' },
    });
    expect(typeof (item?.lastRejection as { rejectedAt: unknown }).rejectedAt).toBe('string');
  });

  test('FR-ACC-07 D-105 a reason without a note is saved with no note', async () => {
    const vendor = await createAccount(app, 'vendor');

    await reject(vendor.id, { reason: 'duplicate_account' });

    const [item] = (await list('Rejected')).body as { lastRejection: unknown }[];
    expect(item?.lastRejection).toMatchObject({ reason: 'duplicate_account', note: null });
  });

  test('FR-ACC-07 D-105 an application never rejected has no last rejection', async () => {
    await createAccount(app, 'vendor');

    const [item] = (await list('Pending')).body as { lastRejection: unknown }[];

    expect(item?.lastRejection).toBeNull();
  });

  test('FR-ACC-07 D-105 settings row SUPPORT-CONTACT holds the support email', async () => {
    const row = await getSetting('SUPPORT-CONTACT');

    expect(row?.value).toEqual({ email: 'support@nowaste.example' });
    expect(row?.source).toContain('D-105');
  });
});

describe('FR-ACC-02 FR-ACC-03 D-105 the applicant sees the reason and may send the application again', () => {
  test('FR-ACC-02 D-105 the rejected vendor sees the reason, the note, the support contact and their application', async () => {
    const vendor = await rejectedVendor();

    const response = await myApplication(vendor.token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      role: 'vendor',
      status: 'Rejected',
      rejection: { reason: 'wrong_location', note: 'The pin is in the Nile.' },
      supportContact: { email: 'support@nowaste.example' },
      vendorProfile: {
        shopName: 'Fatma Bakery',
        vendorType: 'formal',
        contact: '+201012345678',
        address: '12 Tahrir Street, Dokki, Giza',
        latitude: 30.0381,
        longitude: 31.2122,
        opensAt: '00:00',
        closesAt: '23:59',
        branches: [],
      },
      partnerProfile: null,
    });
  });

  test('FR-ACC-02 D-105 a Pending applicant has no rejection to show', async () => {
    const vendor = await createAccount(app, 'vendor');

    const response = await myApplication(await tokenFor(app, vendor.email));

    expect(response.body).toMatchObject({ status: 'Pending', rejection: null });
  });

  test('FR-ACC-02 D-105 the rejected vendor fixes the whole application and it is Pending again', async () => {
    const vendor = await rejectedVendor();

    const response = await sendAgain(vendor.token, { vendorProfile: fixedVendor });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: vendor.id, role: 'vendor', status: 'Pending' });
    expect(await readUserStatus(vendor.id)).toBe('Pending');
    expect((await myApplication(vendor.token)).body).toMatchObject({
      status: 'Pending',
      rejection: null,
      vendorProfile: {
        shopName: 'Fatma Bakery Dokki',
        vendorType: 'informal',
        contact: '+201098765432',
        description: 'Fresh bread every morning',
        address: '14 Tahrir Street, Dokki, Giza',
        latitude: 30.039,
        longitude: 31.213,
        opensAt: '08:00',
        closesAt: '22:00',
        branches: [
          {
            address: '3 Road 9, Maadi, Cairo',
            latitude: 29.96,
            longitude: 31.25,
            opensAt: '09:00',
            closesAt: '21:00',
          },
        ],
      },
    });
  });

  test('FR-ACC-07 D-105 the administrator sees the reapplication on the Pending list with the last reason', async () => {
    const vendor = await rejectedVendor();
    await sendAgain(vendor.token, { vendorProfile: fixedVendor });

    const [item] = (await list('Pending')).body as Record<string, unknown>[];

    expect(item).toMatchObject({
      userId: vendor.id,
      status: 'Pending',
      vendorProfile: { shopName: 'Fatma Bakery Dokki' },
      lastRejection: { reason: 'wrong_location', note: 'The pin is in the Nile.' },
    });
  });

  test('FR-ACC-03 D-105 a rejected partner may change the kind of partner and every detail', async () => {
    const partner = await createAccount(app, 'partner');
    await reject(partner.id, { reason: 'wrong_contact' });
    const token = await tokenFor(app, partner.email);

    const response = await sendAgain(token, { role: 'other', partnerProfile: fixedPartner });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ role: 'other', status: 'Pending' });
    expect((await myApplication(token)).body).toMatchObject({
      role: 'other',
      partnerProfile: {
        organisationName: 'Giza Mosque Kitchen',
        partnerType: 'other',
        otherPartnerType: 'Mosque',
        acceptedFoodTypes: ['bread_and_baked_goods', 'cooked_meals'],
        address: '7 Nile Corniche, Giza',
      },
    });
  });

  test('E-ACC-02 D-105 an invalid application sent again lists the fields and stays Rejected', async () => {
    const vendor = await rejectedVendor();

    const response = await sendAgain(vendor.token, {
      vendorProfile: { ...fixedVendor, shopName: ' ', contact: '123' },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-02', fields: ['shopName', 'contact'] });
    expect(await readUserStatus(vendor.id)).toBe('Rejected');
  });

  test('E-ACC-02 D-105 a vendor cannot send the application again as a partner', async () => {
    const vendor = await rejectedVendor();

    const response = await sendAgain(vendor.token, { role: 'charity', partnerProfile: fixedPartner });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'E-ACC-02',
      fields: expect.arrayContaining(['role']) as unknown,
    });
  });

  test.each(['Pending', 'Approved'])(
    'FR-ACC-07 D-105 a %s application cannot be sent again (409)',
    async (status) => {
      const vendor = await createAccount(app, 'vendor', { status });

      const response = await sendAgain(await tokenFor(app, vendor.email), { vendorProfile: fixedVendor });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'not_rejected', status });
    },
  );

  test('FR-ACC-07 D-105 there is no limit: rejected again, the newest reason is shown, and it can be sent again', async () => {
    const vendor = await rejectedVendor();
    await sendAgain(vendor.token, { vendorProfile: fixedVendor });
    await reject(vendor.id, { reason: 'other', note: 'Opening hours look wrong.' });

    expect((await myApplication(vendor.token)).body).toMatchObject({
      status: 'Rejected',
      rejection: { reason: 'other', note: 'Opening hours look wrong.' },
    });
    const again = await sendAgain(vendor.token, { vendorProfile: fixedVendor });
    expect(again.body).toMatchObject({ status: 'Pending' });
    const [item] = (await list('Pending')).body as { lastRejection: unknown }[];
    expect(item?.lastRejection).toMatchObject({ reason: 'other' });
  });
});
