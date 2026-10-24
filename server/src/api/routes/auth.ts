// SDD IApi: POST /auth/register (US-01). The route checks the body shape and calls the Account Service.
import { Router } from 'express';
import { registerConsumer } from '../../services/account/accountService.js';

export function authRouter(): Router {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const body: unknown = req.body;
    const { email, phone, password, language } =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    // Only these four fields are read; anything else in the body is ignored.
    const consumer = await registerConsumer({ email, phone, password, language });
    res.status(201).json(consumer);
  });

  return router;
}
