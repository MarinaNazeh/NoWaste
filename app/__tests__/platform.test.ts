// SCRUM-69 / TBD-1 (decision D-44): minimum supported versions are Android 7.0 (API 24) and iOS 16.4, the lowest
// that Expo SDK 58 and React Native 0.88 support. They are set in app.json through expo-build-properties.
import appJson from '../app.json';

interface BuildProperties {
  android: { minSdkVersion: number };
  ios: { deploymentTarget: string };
}

function buildProperties(): BuildProperties {
  const plugins: unknown[] = appJson.expo.plugins;
  const entry = plugins.find(
    (plugin): plugin is [string, BuildProperties] =>
      Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  );
  if (!entry) throw new Error('expo-build-properties is not configured in app.json');
  return entry[1];
}

describe('NFR-14 minimum platform versions (TBD-1)', () => {
  test('NFR-14 the minimum Android version is 7.0 (API level 24)', () => {
    expect(buildProperties().android.minSdkVersion).toBe(24);
  });

  test('NFR-14 the minimum iOS version is 16.4', () => {
    expect(buildProperties().ios.deploymentTarget).toBe('16.4');
  });
});
