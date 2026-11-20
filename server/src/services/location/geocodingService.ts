// Written address of a map point in the user's language (decision D-47; IF-UI-02, NFR-06). If the geocoding service
// is down the answer is "no address" and the app falls back to the phone's geocoder (NFR-12).
import { LANGUAGES, type Language } from '@nowaste/shared';
import { getAdapters } from '../../adapters/index.js';
import { AdapterUnavailableError } from '../../adapters/errors.js';
import { SrsError } from '../../domain/errors.js';

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

function coordinate(value: unknown, limit: number): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export async function reverseGeocode(query: {
  latitude: unknown;
  longitude: unknown;
  language: unknown;
}): Promise<{ address: string | null }> {
  const latitude = coordinate(query.latitude, 90);
  const longitude = coordinate(query.longitude, 180);
  const fields = [
    ...(latitude === null ? ['latitude'] : []),
    ...(longitude === null ? ['longitude'] : []),
    ...(isLanguage(query.language) ? [] : ['language']),
  ];
  if (latitude === null || longitude === null || !isLanguage(query.language)) {
    throw new SrsError(400, { error: 'invalid_input', fields });
  }
  try {
    const address = await getAdapters().geocoding.reverse({ latitude, longitude }, query.language);
    return { address };
  } catch (error) {
    if (error instanceof AdapterUnavailableError) return { address: null };
    throw error;
  }
}
