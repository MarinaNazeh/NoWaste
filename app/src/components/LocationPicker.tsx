// Location step of the vendor and partner applications (US-02, US-03): a map pin plus a written address
// (docs/feedback-changes.md). The pin starts at the device GPS location (IF-HW-03). If location permission is denied
// or no position is found, the app says why the location is needed and the user places the pin by hand (IF-HW-04,
// open question 32 / TBD-3). The map itself is the C-24 MapView wrapper.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { MapView, type Coordinates } from './MapView';
import { Notice } from './Notice';
import { TextField } from './TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { spacing } from '@/theme';

// Where the map opens when there is no GPS position: central Cairo (decision D-25). Only a starting view;
// nothing is saved until the user places the pin.
const FALLBACK_CENTER: Coordinates = { latitude: 30.0444, longitude: 31.2357 };

type GpsState = 'asking' | 'found' | 'unavailable';

interface LocationPickerProps {
  pin: Coordinates | null;
  onPinChange: (pin: Coordinates) => void;
  address: string;
  onAddressChange: (address: string) => void;
  pinError?: string;
  addressError?: string;
}

export function LocationPicker({
  pin,
  onPinChange,
  address,
  onAddressChange,
  pinError,
  addressError,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const [gps, setGps] = useState<GpsState>('asking');
  const [center, setCenter] = useState<Coordinates>(FALLBACK_CENTER);

  useEffect(() => {
    let active = true;
    async function locate() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('denied');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCenter(here);
        setGps('found');
        // The location is used only to start the pin; the user can still move it.
        onPinChange(here);
      } catch {
        if (active) setGps('unavailable');
      }
    }
    void locate();
    return () => {
      active = false;
    };
    // Ask once, when the location step appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View testID="location-picker" style={[styles.container, { direction }]}>
      <AppText variant="label">{t('location.title')}</AppText>
      <AppText variant="caption" color="textMuted">
        {t('location.instructions')}
      </AppText>
      {gps === 'unavailable' ? <Notice tone="info" message={t('location.permissionDenied')} /> : null}
      <MapView
        testID="map-view"
        center={center}
        pin={pin}
        onPinChange={onPinChange}
        accessibilityLabel={t('location.mapLabel')}
      />
      <AppText
        variant="caption"
        color={pinError !== undefined ? 'error' : 'textMuted'}
        accessibilityLiveRegion="polite"
      >
        {pinError ??
          (pin === null
            ? t('location.noPin')
            : t('location.pinAt', {
                latitude: pin.latitude.toFixed(5),
                longitude: pin.longitude.toFixed(5),
              }))}
      </AppText>
      <TextField
        testID="register-address"
        label={t('location.addressLabel')}
        placeholder={t('location.addressPlaceholder')}
        value={address}
        onChangeText={onAddressChange}
        error={addressError}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
