// GET /health: 200 {"status":"ok","db":"ok"} when the database answers, otherwise 503 {"status":"error","db":"down"}.
import { Router } from 'express';
import type { HealthService } from '../../services/health/healthService.js';

export function healthRouter(healthService: HealthService): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    const result = await healthService.check();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
  });
  return router;
}
