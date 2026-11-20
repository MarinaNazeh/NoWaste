// Geocoding adapter (decision D-47): the written address of a map point in the language the user chose
// (IF-UI-02, NFR-06). The phone's own geocoder always answers in the phone's language, so the server asks a
// geocoding service with an explicit language. Part of the map service (SRS 2.4, 3.3); provider: SRS TBD-2.
import type { Language } from '@nowaste/shared';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface IGeocoding {
  /** The address of the point in `language`, or null when the service knows no address there. */
  reverse(point: GeoPoint, language: Language): Promise<string | null>;
}
