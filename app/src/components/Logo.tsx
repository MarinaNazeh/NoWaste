// The official NoWaste logo (assets/logo.png), shown unchanged at its original proportions.
import { Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const LOGO_ASPECT_RATIO = 448 / 375; // width / height of assets/logo.png

export function Logo({ width }: { width: number }) {
  const { t } = useTranslation();
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[styles.logo, { width, height: width / LOGO_ASPECT_RATIO }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel={t('app.logoLabel')}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
