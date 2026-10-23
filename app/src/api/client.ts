// Client for the SDD IApi (REST over HTTPS, SDD 3.2.3). The base URL comes from app/.env (EXPO_PUBLIC_API_URL).

const REQUEST_TIMEOUT_MS = 5000;

export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url === undefined || url === '') {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy app/.env.example to app/.env.');
  }
  return url.replace(/\/+$/, '');
}

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'down';
}

/** Calls GET /health. Returns true only when the server and its database are both up. */
export async function isServerHealthy(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, { signal: controller.signal });
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as HealthResponse;
    return body.status === 'ok' && body.db === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
