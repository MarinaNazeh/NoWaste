// Test-only helpers for the real nowaste_test database. Application SQL stays in server/src/data.
import { getPool } from '../../src/data/db.js';

export async function deleteAllUsers(): Promise<void> {
  await getPool().query('TRUNCATE users CASCADE');
}

export async function countUsers(): Promise<number> {
  const result = await getPool().query<{ count: string }>('SELECT count(*) AS count FROM users');
  return Number(result.rows[0]?.count ?? 0);
}
