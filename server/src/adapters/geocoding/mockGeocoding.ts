// Mock geocoding for development and tests (NFR-13). Knows no addresses unless a test adds some, so in mock mode the
// app falls back to the phone's own geocoder, as before D-47.
import type { Language } from '@nowaste/shared';
import { AdapterUnavailableError } from '../errors.js';
import type { GeoPoint, IGeocoding } from './IGeocoding.js';

export class MockGeocoding implements IGeocoding {
  available = true;
  /** Addresses by "latitude,longitude,language", for tests. */
  readonly addresses = new Map<string, string>();
  readonly calls: Array<{ point: GeoPoint; language: Language }> = [];

  reverse(point: GeoPoint, language: Language): Promise<string | null> {
    if (!this.available) return Promise.reject(new AdapterUnavailableError('geocoding'));
    this.calls.push({ point, language });
    return Promise.resolve(this.addresses.get(`${point.latitude},${point.longitude},${language}`) ?? null);
  }
}
