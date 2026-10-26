// US-01 Consumer registration: POST /auth/register (SDD IApi, C-03 Account Service).
// Tests come from FR-ACC-01, E-ACC-01, E-ACC-02 and NFR-09b. They run against the real nowaste_test database.
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/api/app.js';
import { closePool } from '../src/data/db.js';
import { findUserByEmail, findUserByPhone } from '../src/data/userRepository.js';
import { countUsers, deleteAllUsers } from './helpers/database.js';

const app = createApp();

function register(body: Record<string, unknown>) {
  return request(app).post('/auth/register').send(body);
}

const valid = { password: 'abcd1234', language: 'en' };

beforeEach(async () => {
  await deleteAllUsers();
});

afterAll(async () => {
  await deleteAllUsers();
  await closePool();
});

describe('FR-ACC-01 consumer registration with an email address or phone number', () => {
  test('FR-ACC-01 register with a valid email creates an Active consumer', async () => {
    const response = await register({ ...valid, email: 'mona@example.com' });

    expect(response.status).toBe(201);
    const body = response.body as Record<string, unknown>;
    // Exactly these three fields: never the password or its hash.
    expect(body).toEqual({ id: body.id, role: 'consumer', status: 'Active' });
    expect(typeof body.id).toBe('string');
    const stored = await findUserByEmail('mona@example.com');
    expect(stored?.id).toBe(body.id);
    expect(stored?.phone).toBeNull();
  });

  test('FR-ACC-01 register with a valid phone creates an Active consumer stored as +20', async () => {
    const response = await register({ ...valid, phone: '01012345678' });

    expect(response.status).toBe(201);
    const body = response.body as Record<string, unknown>;
    // Exactly these three fields: never the password or its hash.
    expect(body).toEqual({ id: body.id, role: 'consumer', status: 'Active' });
    expect(typeof body.id).toBe('string');
    const stored = await findUserByPhone('+201012345678');
    expect(stored?.id).toBe(body.id);
    expect(stored?.email).toBeNull();
  });

  test('FR-ACC-01 register with neither email nor phone returns E-ACC-02', async () => {
    const response = await register(valid);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-02', fields: ['email', 'phone'] });
    expect(await countUsers()).toBe(0);
  });

  test('FR-ACC-09 registration saves the chosen language on the account', async () => {
    await register({ ...valid, email: 'arabic@example.com', language: 'ar' });

    expect((await findUserByEmail('arabic@example.com'))?.language).toBe('ar');
  });
});

describe('E-ACC-01 email or phone already registered', () => {
  test('E-ACC-01 duplicate email returns 409 with field email', async () => {
    await register({ ...valid, email: 'mona@example.com' });
    const response = await register({ ...valid, email: 'mona@example.com' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-ACC-01', field: 'email' });
    expect(await countUsers()).toBe(1);
  });

  test('E-ACC-01 duplicate email with different letter case returns 409', async () => {
    await register({ ...valid, email: 'mona@example.com' });
    const response = await register({ ...valid, email: 'Mona@EXAMPLE.com' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-ACC-01', field: 'email' });
    expect(await countUsers()).toBe(1);
  });

  test('E-ACC-01 duplicate phone returns 409 with field phone', async () => {
    await register({ ...valid, phone: '01012345678' });
    const response = await register({ ...valid, phone: '01012345678' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-ACC-01', field: 'phone' });
    expect(await countUsers()).toBe(1);
  });
});

describe('E-ACC-02 invalid email, phone or password (password rules: decision D-11, TBD-4)', () => {
  async function expectRejected(body: Record<string, unknown>, fields: string[]) {
    const response = await register(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-02', fields });
    expect(await countUsers()).toBe(0);
  }

  async function expectAccepted(body: Record<string, unknown>) {
    const response = await register(body);
    expect(response.status).toBe(201);
  }

  test('E-ACC-02 password of 7 characters is rejected', async () => {
    await expectRejected({ ...valid, email: 'a@example.com', password: 'abc1234' }, ['password']);
  });

  test('E-ACC-02 password of 8 characters is accepted', async () => {
    await expectAccepted({ ...valid, email: 'a@example.com', password: 'abcd1234' });
  });

  test('E-ACC-02 password with letters only is rejected', async () => {
    await expectRejected({ ...valid, email: 'a@example.com', password: 'abcdefgh' }, ['password']);
  });

  test('E-ACC-02 password with digits only is rejected', async () => {
    await expectRejected({ ...valid, email: 'a@example.com', password: '12345678' }, ['password']);
  });

  test('E-ACC-02 email without @ is rejected', async () => {
    await expectRejected({ ...valid, email: 'userexample.com' }, ['email']);
  });

  test('E-ACC-02 phone with 10 digits is rejected', async () => {
    await expectRejected({ ...valid, phone: '0101234567' }, ['phone']);
  });

  test('E-ACC-02 phone with 12 digits is rejected', async () => {
    await expectRejected({ ...valid, phone: '010123456789' }, ['phone']);
  });

  test('E-ACC-02 phone with 11 digits is accepted', async () => {
    await expectAccepted({ ...valid, phone: '01112345678' });
  });

  test('E-ACC-02 phone with a wrong prefix such as 013 is rejected', async () => {
    await expectRejected({ ...valid, phone: '01312345678' }, ['phone']);
  });

  test.each(['010', '011', '012', '015'])('E-ACC-02 phone starting %s is accepted', async (prefix) => {
    await expectAccepted({ ...valid, phone: `${prefix}12345678` });
  });

  test('E-ACC-02 several invalid fields at once are all listed', async () => {
    await expectRejected(
      { email: 'userexample.com', phone: '0131234567', password: 'short', language: 'en' },
      ['email', 'phone', 'password'],
    );
  });

  test('E-ACC-02 a missing or unsupported language is rejected', async () => {
    await expectRejected({ email: 'a@example.com', password: 'abcd1234', language: 'fr' }, ['language']);
  });
});

describe('NFR-09b passwords are stored only as salted hashes', () => {
  test('NFR-09b the stored hash is not the password and verifies with bcrypt', async () => {
    const response = await register({ ...valid, email: 'hash@example.com' });
    const stored = await findUserByEmail('hash@example.com');

    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordHash).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, stored?.passwordHash ?? '')).toBe(true);
    expect(bcrypt.getRounds(stored?.passwordHash ?? '')).toBe(12);
    expect(JSON.stringify(response.body)).not.toContain(valid.password);
    expect(JSON.stringify(response.body)).not.toContain(stored?.passwordHash);
  });

  test('NFR-09b two users with the same password get different hashes', async () => {
    await register({ ...valid, email: 'one@example.com' });
    await register({ ...valid, email: 'two@example.com' });

    const one = await findUserByEmail('one@example.com');
    const two = await findUserByEmail('two@example.com');
    expect(one?.passwordHash).not.toBe(two?.passwordHash);
  });
});

describe('FR-ACC-01 and E-ACC-02 Arabic input and both identifiers (decisions D-11, D-12, D-18)', () => {
  test('E-ACC-02 a password of Arabic letters and Arabic-Indic digits is accepted', async () => {
    const response = await register({
      email: 'arabic-pass@example.com',
      password: 'كلمةسر١٢',
      language: 'ar',
    });

    expect(response.status).toBe(201);
  });

  test('E-ACC-02 a password of Arabic letters only is rejected', async () => {
    const response = await register({
      email: 'arabic-pass@example.com',
      password: 'كلمةسرطويلة',
      language: 'ar',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'E-ACC-02', fields: ['password'] });
  });

  test('E-ACC-02 a phone typed with Arabic-Indic digits is accepted and stored as +20', async () => {
    const response = await register({ ...valid, phone: '٠١٠١٢٣٤٥٦٧٨' });

    expect(response.status).toBe(201);
    expect((await findUserByPhone('+201012345678'))?.id).toBe((response.body as { id: string }).id);
  });

  test('FR-ACC-01 register with both email and phone stores both', async () => {
    const response = await register({ ...valid, email: 'both@example.com', phone: '01512345678' });

    expect(response.status).toBe(201);
    const stored = await findUserByEmail('both@example.com');
    expect(stored?.phone).toBe('+201512345678');
  });

  test('E-ACC-01 a new email with an already registered phone returns field phone', async () => {
    await register({ ...valid, phone: '01512345678' });
    const response = await register({ ...valid, email: 'new@example.com', phone: '01512345678' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'E-ACC-01', field: 'phone' });
    expect(await countUsers()).toBe(1);
  });

  test('E-ACC-02 a malformed JSON body is rejected with invalid_json and creates nothing', async () => {
    const response = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@example.com", "password": "abcd1234",');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_json' });
    expect(await countUsers()).toBe(0);
  });
});

describe('NFR-09b the password is never logged', () => {
  test('NFR-09b registration success, duplicate, invalid and malformed requests never log the password', async () => {
    const secret = 'SecretPass987';
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    try {
      await register({ ...valid, email: 'logs@example.com', password: secret });
      await register({ ...valid, email: 'logs@example.com', password: secret });
      await register({ email: 'not-an-email', password: secret, language: 'en' });
      await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send(`{"email": "x@example.com", "password": "${secret}",`);

      const logged = spies.flatMap((spy) => spy.mock.calls.map((args) => args.map(String).join(' ')));
      // The logging was captured (the malformed body is reported), but without its content.
      expect(logged.some((line) => line.includes('Rejected request body'))).toBe(true);
      expect(logged.filter((line) => line.includes(secret))).toEqual([]);
    } finally {
      spies.forEach((spy) => {
        spy.mockRestore();
      });
    }
  });
});
