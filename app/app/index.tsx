// Welcome screen (US-09, US-01): logo, welcome message, English / العربية switch, Register and Log in.
// The language can be switched here before registration or login (FR-ACC-09, IF-UI-02).
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ServerStatus } from '@/components/ServerStatus';
import { colors, radius, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showLoginNote, setShowLoginNote] = useState(false);

  return (
    <Screen edges={['top']} backgroundColor={colors.primary}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <LanguageSwitch tone="onDark" compact />
          </View>
          <Logo width={180} />
        </View>

        <View style={styles.card}>
          <View style={styles.texts}>
            <AppText variant="title">{t('welcome.title')}</AppText>
            <AppText color="textMuted">{t('welcome.message')}</AppText>
          </View>

          <View style={styles.actions}>
            <Button
              testID="welcome-register"
              label={t('welcome.register')}
              accessibilityHint={t('welcome.registerHint')}
              onPress={() => {
                router.push('/register');
              }}
            />
            {/* Log in is US-04 (turn 3). Until then the button only explains that it is coming. */}
            <Button
              testID="welcome-login"
              variant="secondary"
              label={t('welcome.login')}
              accessibilityHint={t('welcome.loginHint')}
              onPress={() => {
                setShowLoginNote(true);
              }}
            />
            {showLoginNote ? <Notice tone="info" message={t('welcome.loginComingSoon')} /> : null}
          </View>

          <View style={styles.footer}>
            <ServerStatus />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  card: {
    flex: 1,
    marginTop: -spacing.xl,
    backgroundColor: colors.background,
    borderTopStartRadius: radius.lg + 8,
    borderTopEndRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  texts: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
