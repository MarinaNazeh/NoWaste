// Root layout (expo-router). Loads the Arabic and English texts before any screen renders.
import '@/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

export default function RootLayout() {
  const { t } = useTranslation();
  return (
    <>
      <Stack screenOptions={{ title: t('app.name') }} />
      <StatusBar style="auto" />
    </>
  );
}
