// The users table enforces the SDD 4.2 rules itself, even if a service has a bug.
// Runs against the real nowaste_test database through the repository (no SQL in the test).
import { closePool } from '../src/data/db.js';
import { insertUser, type NewUser } from '../src/data/userRepository.js';
import { deleteAllUsers } from './helpers/database.js';

const base: NewUser = {
  email: 'table@example.com',
  phone: null,
  passwordHash: '$2b$12$notarealhashbutlongenoughforthistest.....................',
  role: 'consumer',
  status: 'Active',
  language: 'en',
};

beforeEach(async () => {
  await deleteAllUsers();
});

afterAll(async () => {
  await deleteAllUsers();
  await closePool();
});

describe('FR-ACC-01 users table rules (SDD 4.2 User)', () => {
  test('FR-ACC-01 the table refuses a user with neither email nor phone', async () => {
    await expect(insertUser({ ...base, email: null, phone: null })).rejects.toThrow(/users_email_or_phone/);
  });

  test.each(['consumer', 'vendor', 'charity', 'composting', 'admin'])(
    'FR-ACC-01 the table accepts role %s',
    async (role) => {
      await expect(insertUser({ ...base, role: role as NewUser['role'] })).resolves.toMatchObject({ role });
    },
  );

  test('FR-ACC-01 the table refuses a role that is not in the SDD', async () => {
    await expect(insertUser({ ...base, role: 'superuser' as NewUser['role'] })).rejects.toThrow(
      /users_role_check/,
    );
  });

  test.each(['Active', 'Pending', 'Approved', 'Rejected', 'Suspended', 'Removed'])(
    'FR-ACC-01 the table accepts status %s',
    async (status) => {
      await expect(insertUser({ ...base, status: status as NewUser['status'] })).resolves.toMatchObject({
        status,
      });
    },
  );

  test('FR-ACC-01 the table refuses a status that is not in the SDD', async () => {
    await expect(insertUser({ ...base, status: 'Banned' as NewUser['status'] })).rejects.toThrow(
      /users_status_check/,
    );
  });

  test('FR-ACC-09 the table refuses a language other than ar or en', async () => {
    await expect(insertUser({ ...base, language: 'fr' as NewUser['language'] })).rejects.toThrow(
      /users_language_check/,
    );
  });
});
