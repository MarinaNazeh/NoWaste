import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { createHealthService } from '../src/services/health/healthService.js';
import { closePool } from '../src/data/db.js';

afterAll(async () => {
  await closePool();
});

describe('GET /health', () => {
  test('HEALTH-01 GET /health returns ok when the database is up', async () => {
    // Uses the real nowaste_test database (TEST_DATABASE_URL).
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', db: 'ok' });
  });

  test('HEALTH-03 GET /health returns 503 db down when the database is unreachable', async () => {
    const unreachable = createHealthService(() => Promise.reject(new Error('connection refused')));
    const response = await request(createApp({ healthService: unreachable })).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', db: 'down' });
  });
});
