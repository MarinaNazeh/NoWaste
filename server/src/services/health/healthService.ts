// Infrastructure service behind GET /health. It is not one of the SDD services C-03 to C-18;
// it only checks that the API can reach the database (SDD C-28).
import { getPostgisVersion } from '../../data/healthRepository.js';

export type HealthResult = { status: 'ok'; db: 'ok' } | { status: 'error'; db: 'down' };

export interface HealthService {
  check(): Promise<HealthResult>;
}

export function createHealthService(
  checkDatabase: () => Promise<unknown> = getPostgisVersion,
): HealthService {
  return {
    async check() {
      try {
        await checkDatabase();
        return { status: 'ok', db: 'ok' };
      } catch {
        return { status: 'error', db: 'down' };
      }
    },
  };
}
