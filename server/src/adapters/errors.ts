// Raised by an adapter when its external service cannot be reached. Services catch it so that functions which do
// not depend on that service keep working (NFR-12).
export class AdapterUnavailableError extends Error {
  constructor(public readonly adapter: string) {
    super(`${adapter} is unavailable`);
    this.name = 'AdapterUnavailableError';
  }
}
