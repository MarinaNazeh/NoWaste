// Success screen after registration (US-01). Logging in is US-04 and arrives in turn 3.
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/theme';

export default function RegisteredScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.center}>
        <Logo width={120} />
        <View
          style={styles.badge}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('registered.successLabel')}
        >
          <AppText variant="title" color="onPrimary" center style={styles.check}>
            ✓
          </AppText>
        </View>
        <AppText testID="registered-title" variant="heading" center accessibilityRole="header">
          {t('registered.title')}
        </AppText>
        <AppText center>{t('registered.message')}</AppText>
        <AppText variant="caption" color="textMuted" center>
          {t('registered.next')}
        </AppText>
      </View>
      <Button
        label={t('registered.backToStart')}
        onPress={() => {
          router.dismissTo('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 64,
    height: 64,
    marginTop: -spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    justifyContent: 'center',
  },
  check: {
    lineHeight: 36,
  },
});
