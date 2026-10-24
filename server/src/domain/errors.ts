// Errors that map to SRS error conditions. The API layer turns them into {"error": "<SRS ID>", ...} responses.

/** An SRS error condition, for example E-ACC-02. */
export class SrsError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly body: { error: string } & Record<string, unknown>,
  ) {
    super(body.error);
  }
}
