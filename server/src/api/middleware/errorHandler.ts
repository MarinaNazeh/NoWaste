// Last-resort error handler. Errors that come from SRS error conditions are answered with the SRS error ID,
// for example {"error":"E-ACC-02","fields":["email"]}; those are added with the user stories.
import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal' });
};
