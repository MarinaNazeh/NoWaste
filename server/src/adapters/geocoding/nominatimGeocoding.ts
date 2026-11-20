// Geocoding through OpenStreetMap Nominatim (decision D-47, opt-in with GEOCODING_PROVIDER=nominatim, needs team
// approval under TBD-2). No key is needed. Its usage policy allows about one request a second and asks for an
// identifying User-Agent; no user data is sent, only the map point and the language.
import type { Language } from '@nowaste/shared';
import { AdapterUnavailableError } from '../errors.js';
import type { GeoPoint, IGeocoding } from './IGeocoding.js';

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
// Technical time limit for the HTTP call, not an SRS business rule.
const TIMEOUT_MS = 5000;

export class NominatimGeocoding implements IGeocoding {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async reverse(point: GeoPoint, language: Language): Promise<string | null> {
    const url = new URL(ENDPOINT);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(point.latitude));
    url.searchParams.set('lon', String(point.longitude));
    url.searchParams.set('accept-language', language);
    url.searchParams.set('zoom', '18');
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { 'User-Agent': 'NoWaste/0.1 (university project)' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new AdapterUnavailableError('geocoding');
    }
    if (!response.ok) throw new AdapterUnavailableError('geocoding');
    const body = (await response.json()) as { display_name?: unknown };
    return typeof body.display_name === 'string' && body.display_name !== '' ? body.display_name : null;
  }
}
