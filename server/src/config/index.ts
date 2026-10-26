// Reads configuration from environment variables (server/.env locally, CI variables in GitHub Actions).
// No secrets are stored in code. See server/.env.example for the list of variables.

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env.`);
  }
  return value;
}

export interface Config {
  port: number;
  databaseUrl: string;
}

export function loadConfig(): Config {
  // Jest sets NODE_ENV=test, so the automated tests always use the separate nowaste_test database.
  const isTest = process.env.NODE_ENV === 'test';
  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: isTest ? required('TEST_DATABASE_URL') : required('DATABASE_URL'),
  };
}
