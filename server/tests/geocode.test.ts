// Decision D-47: GET /geocode/reverse gives the address of a map pin in the app's language (IF-UI-02, NFR-06), so an
// Arabic user gets an Arabic address even on a phone set to English. Adapters are mocks; no database is needed.
import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { createAdapters, loadGeocodingProvider, setAdapters } from '../src/adapters/index.js';
import { MockGeocoding } from '../src/adapters/geocoding/mockGeocoding.js';
import { NominatimGeocoding } from '../src/adapters/geocoding/nominatimGeocoding.js';
import { AdapterUnavailableError } from '../src/adapters/errors.js';

const app = createApp({ healthService: { check: () => Promise.resolve({ status: 'ok', db: 'ok' }) } });
let geocoding: MockGeocoding;

beforeEach(() => {
  geocoding = new MockGeocoding();
  geocoding.addresses.set('30.0444,31.2357,ar', 'ميدان التحرير، القاهرة');
  geocoding.addresses.set('30.0444,31.2357,en', 'Tahrir Square, Cairo');
  setAdapters({ ...createAdapters('mock', 'mock'), geocoding });
});

afterAll(() => {
  setAdapters(undefined);
});

describe('NFR-06 IF-UI-02 address of a map pin in the chosen language', () => {
  test('NFR-06 the address is returned in Arabic when the language is ar', async () => {
    const res = await request(app).get('/geocode/reverse?latitude=30.0444&longitude=31.2357&language=ar');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ address: 'ميدان التحرير، القاهرة' });
    expect(geocoding.calls).toEqual([{ point: { latitude: 30.0444, longitude: 31.2357 }, language: 'ar' }]);
  });

  test('IF-UI-02 the address is returned in English when the language is en', async () => {
    const res = await request(app).get('/geocode/reverse?latitude=30.0444&longitude=31.2357&language=en');
    expect(res.body).toEqual({ address: 'Tahrir Square, Cairo' });
  });

  test('IF-UI-02 no known address gives address null', async () => {
    const res = await request(app).get('/geocode/reverse?latitude=10&longitude=10&language=en');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ address: null });
  });

  test('NFR-12 an unavailable geocoding service gives address null, not an error', async () => {
    geocoding.available = false;
    const res = await request(app).get('/geocode/reverse?latitude=30.0444&longitude=31.2357&language=ar');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ address: null });
  });

  test.each([
    ['latitude=&longitude=31&language=ar', ['latitude']],
    ['latitude=91&longitude=31&language=ar', ['latitude']],
    ['latitude=30&longitude=181&language=ar', ['longitude']],
    ['latitude=30&longitude=abc&language=fr', ['longitude', 'language']],
    ['', ['latitude', 'longitude', 'language']],
  ])('IF-UI-02 invalid query "%s" is refused naming %j', async (query, fields) => {
    const res = await request(app).get(`/geocode/reverse?${query}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input', fields });
    expect(geocoding.calls).toEqual([]);
  });

  test('IF-COM-03 the pin address needs no login (applicants have no account yet)', async () => {
    const res = await request(app).get('/geocode/reverse?latitude=30.0444&longitude=31.2357&language=en');
    expect(res.status).not.toBe(401);
  });
});

describe('NFR-13 geocoding provider choice', () => {
  test('NFR-13 the mock is the default provider', () => {
    expect(loadGeocodingProvider({})).toBe('mock');
    // An empty environment, so the developer's own server/.env does not change the answer.
    expect(createAdapters('mock', loadGeocodingProvider({})).geocoding).toBeInstanceOf(MockGeocoding);
  });

  test('NFR-13 GEOCODING_PROVIDER=nominatim picks OpenStreetMap Nominatim, anything else is refused', () => {
    expect(
      createAdapters('mock', loadGeocodingProvider({ GEOCODING_PROVIDER: 'nominatim' })).geocoding,
    ).toBeInstanceOf(NominatimGeocoding);
    expect(() => loadGeocodingProvider({ GEOCODING_PROVIDER: 'google' })).toThrow(/GEOCODING_PROVIDER/);
  });
});

describe('NFR-06 Nominatim adapter (fetch mocked, no network)', () => {
  function respond(ok: boolean, body: unknown) {
    return jest.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
  }

  test('NFR-06 asks for the chosen language and returns display_name', async () => {
    const fetchFn = respond(true, { display_name: 'ميدان التحرير، القاهرة' });
    const address = await new NominatimGeocoding(fetchFn).reverse(
      { latitude: 30.0444, longitude: 31.2357 },
      'ar',
    );
    expect(address).toBe('ميدان التحرير، القاهرة');
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('accept-language')).toBe('ar');
    expect(url.searchParams.get('lat')).toBe('30.0444');
    expect(url.searchParams.get('lon')).toBe('31.2357');
    expect(new Headers(init.headers).get('User-Agent')).toMatch(/NoWaste/);
  });

  test('IF-UI-02 a point with no address gives null', async () => {
    const fetchFn = respond(true, { error: 'Unable to geocode' });
    await expect(
      new NominatimGeocoding(fetchFn).reverse({ latitude: 0, longitude: 0 }, 'en'),
    ).resolves.toBeNull();
  });

  test('NFR-12 a failed or refused request throws AdapterUnavailableError', async () => {
    await expect(
      new NominatimGeocoding(respond(false, {})).reverse({ latitude: 0, longitude: 0 }, 'en'),
    ).rejects.toBeInstanceOf(AdapterUnavailableError);
    const offline = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(
      new NominatimGeocoding(offline).reverse({ latitude: 0, longitude: 0 }, 'en'),
    ).rejects.toBeInstanceOf(AdapterUnavailableError);
  });
});
