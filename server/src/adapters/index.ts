// Chooses the adapter implementations (SDD 3.3.2 Adapter pattern). ADAPTER_MODE=mock (the default) uses the mocks
// for development and tests (NFR-13). Live adapters wait for the providers to be chosen (SRS TBD-2).
// C-24 Map View lives in the app (app/src/components/MapView.tsx), not here.
import type { IMessaging } from './email-sms/IMessaging.js';
import { MockMessaging } from './email-sms/mockMessaging.js';
import type { IVision } from './ai-vision/IVision.js';
import { MockVision } from './ai-vision/mockVision.js';
import type { IPaymentGateway } from './payment-gateway/IPaymentGateway.js';
import { MockPaymentGateway } from './payment-gateway/mockPaymentGateway.js';
import type { IGeocoding } from './geocoding/IGeocoding.js';
import { MockGeocoding } from './geocoding/mockGeocoding.js';
import { NominatimGeocoding } from './geocoding/nominatimGeocoding.js';
import type { IPush } from './push/IPush.js';
import { MockPush } from './push/mockPush.js';

export type AdapterMode = 'mock' | 'live';

export interface Adapters {
  paymentGateway: IPaymentGateway;
  vision: IVision;
  push: IPush;
  messaging: IMessaging;
  geocoding: IGeocoding;
}

export function loadAdapterMode(env: NodeJS.ProcessEnv = process.env): AdapterMode {
  const mode = env.ADAPTER_MODE ?? 'mock';
  if (mode !== 'mock' && mode !== 'live') {
    throw new Error(`ADAPTER_MODE must be "mock" or "live", got "${mode}".`);
  }
  return mode;
}

export type GeocodingProvider = 'mock' | 'nominatim';

/** GEOCODING_PROVIDER (decision D-47): "mock" by default; "nominatim" uses OpenStreetMap Nominatim. */
export function loadGeocodingProvider(env: NodeJS.ProcessEnv = process.env): GeocodingProvider {
  const provider = env.GEOCODING_PROVIDER ?? 'mock';
  if (provider !== 'mock' && provider !== 'nominatim') {
    throw new Error(`GEOCODING_PROVIDER must be "mock" or "nominatim", got "${provider}".`);
  }
  return provider;
}

export function createAdapters(
  mode: AdapterMode = loadAdapterMode(),
  geocodingProvider: GeocodingProvider = loadGeocodingProvider(),
): Adapters {
  if (mode === 'live') {
    throw new Error('Live adapters are not available: the providers are not chosen yet (SRS TBD-2).');
  }
  return {
    paymentGateway: new MockPaymentGateway(),
    vision: new MockVision(),
    push: new MockPush(),
    messaging: new MockMessaging(),
    geocoding: geocodingProvider === 'nominatim' ? new NominatimGeocoding() : new MockGeocoding(),
  };
}

let current: Adapters | undefined;

/** The adapters the services use, created once from the environment. */
export function getAdapters(): Adapters {
  return (current ??= createAdapters());
}

/** Tests put mocks they control in place (and undefined to go back to the environment's). */
export function setAdapters(adapters: Adapters | undefined): void {
  current = adapters;
}
