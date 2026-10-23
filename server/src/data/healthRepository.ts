// C-27 Data Access: database check used by GET /health.
import { getPool } from './db.js';

/** Returns the PostGIS version string. Throws if the database cannot be reached. */
export async function getPostgisVersion(): Promise<string> {
  const result = await getPool().query<{ version: string }>('SELECT PostGIS_Version() AS version');
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error('PostGIS_Version() returned no row');
  }
  return row.version;
}
