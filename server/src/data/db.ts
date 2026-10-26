// C-27 Data Access: the single PostgreSQL connection pool. SQL lives only in server/src/data.
import { Pool } from 'pg';
import { loadConfig } from '../config/index.js';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool === undefined) {
    pool = new Pool({
      connectionString: loadConfig().databaseUrl,
      // Fail fast so GET /health can report "db down" instead of hanging.
      connectionTimeoutMillis: 3000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool !== undefined) {
    const current = pool;
    pool = undefined;
    await current.end();
  }
}
