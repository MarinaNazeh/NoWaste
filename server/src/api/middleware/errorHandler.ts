// Turns errors into responses. SRS error conditions are answered with their SRS error ID,
// for example {"error":"E-ACC-02","fields":["email"]}.
// Request bodies are never logged, because they can contain passwords (NFR-09b).
import type { ErrorRequestHandler } from 'express';
import { SrsError } from '../../domain/errors.js';

function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SrsError) {
    res.status(err.httpStatus).json(err.body);
    return;
  }
  if (isBodyParserError(err) && err.status === 400) {
    // Malformed JSON. The parser error holds the raw body, so only the type is logged.
    console.error(`Rejected request body: ${err.type}`);
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  console.error(err instanceof Error ? (err.stack ?? err.message) : 'Unknown error');
  res.status(500).json({ error: 'internal' });
};
