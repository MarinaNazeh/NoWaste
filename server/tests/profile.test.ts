// FR-ACC-06 profile: a logged-in user changes their password (asked for by Maryam on 2026-11-14, decision D-95).
// POST /users/me/password {currentPassword, newPassword}: the current password must be right (E-ACC-03, as at log in)
// and the new one must follow the US-01 password rules (E-ACC-02, the shared validator). Runs against nowaste_test.
import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { PASSWORD, createAccount, tokenFor } from './helpers/accounts.js';
import { deleteAllUsers } from './helpers/database.js';
import { post } from './helpers/listings.js';

const app = createApp();
let email: string;
let token: string;

beforeEach(async () => {
  await deleteAllUsers();
  const account = await createAccount(app, 'consumer');
  email = account.email;
  token = await tokenFor(app, email);
});

afterAll(async () => {
  await deleteAllUsers();
  await closePool();
});

const change = (body: Record<string, unknown>) => post(app, '/users/me/password', token, body);
const logIn = (password: string) => request(app).post('/auth/login').send({ emailOrPhone: email, password });

describe('FR-ACC-06 change password', () => {
  test('FR-ACC-06 with the right current password the new password is saved and the old one stops working', async () => {
    const response = await change({ currentPassword: PASSWORD, newPassword: 'newpass99' });

    expect(response.status).toBe(204);
    expect((await logIn('newpass99')).status).toBe(200);
    expect((await logIn(PASSWORD)).status).toBe(401);
  });

  test('FR-ACC-06 the user stays logged in after changing the password', async () => {
    await change({ currentPassword: PASSWORD, newPassword: 'newpass99' });

    expect((await request(app).get('/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  test('E-ACC-03 a wrong current password is refused and nothing changes', async () => {
    const response = await change({ currentPassword: 'wrong123', newPassword: 'newpass99' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-03', fields: ['currentPassword'] });
    expect((await logIn(PASSWORD)).status).toBe(200);
  });

  test.each([
    ['too short', 'ab12'],
    ['without a digit', 'abcdefgh'],
    ['without a letter', '12345678'],
    ['missing', undefined],
  ])('E-ACC-02 a new password %s is refused', async (_case, newPassword) => {
    const response = await change({ currentPassword: PASSWORD, newPassword });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-02', fields: ['newPassword'] });
    expect((await logIn(PASSWORD)).status).toBe(200);
  });
});
