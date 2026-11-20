// GET /geocode/reverse?latitude=&longitude=&language= (decision D-47): the written address of a map pin in the
// app's language. Public, because vendors and partners place the pin before they have an account (US-02, US-03).
import { Router } from 'express';
import { reverseGeocode } from '../../services/location/geocodingService.js';

export function geocodeRouter(): Router {
  const router = Router();
  router.get('/geocode/reverse', async (req, res) => {
    const { latitude, longitude, language } = req.query;
    res.json(await reverseGeocode({ latitude, longitude, language }));
  });
  return router;
}
