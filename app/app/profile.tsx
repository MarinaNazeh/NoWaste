// Edit profile (FR-ACC-06, D-95, asked for by Maryam on 2026-11-14): the language (FR-ACC-09), a password change
// with the US-01 rules (checked here and on the server with the shared validator) and Log out (FR-ACC-04).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isValidPassword } from '@nowaste/shared';
import { changePassword } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Notice } from '@/components/Notice';
import { PasswordRules } from '@/components/PasswordRules';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { spacing } from '@/theme';

type FieldError = 'currentRequired' | 'wrongCurrent' | 'newPasswordInvalid';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { direction } = useLanguage();
  const { token, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [currentError, setCurrentError] = useState<FieldError | null>(null);
  const [nextError, setNextError] = useState<FieldError | null>(null);
  const [result, setResult] = useState<'saved' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);

  if (token === null) return <Redirect href="/" />;

  async function save() {
    if (token === null) return;
    setResult(null);
    const missingCurrent = current === '';
    const badNext = !isValidPassword(next);
    setCurrentError(missingCurrent ? 'currentRequired' : null);
    setNextError(badNext ? 'newPasswordInvalid' : null);
    if (missingCurrent || badNext) return;
    setBusy(true);
    const answer = await changePassword(token, current, next);
    setBusy(false);
    if (answer.kind === 'ok') {
      setCurrent('');
      setNext('');
      setResult('saved');
    } else if (answer.kind === 'wrongCurrent') setCurrentError('wrongCurrent');
    else if (answer.kind === 'invalidNew') setNextError('newPasswordInvalid');
    else if (answer.kind === 'unauthorized' || answer.kind === 'suspended') void signOut();
    else setResult('failed');
  }

  return (
    <Screen scroll>
      <View testID="profile-screen" style={[styles.content, { direction }]}>
        <View style={styles.section}>
          <AppText variant="label">{t('profile.languageLabel')}</AppText>
          <LanguageSwitch />
        </View>

        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            {t('profile.passwordTitle')}
          </AppText>
          <TextField
            testID="profile-current-password"
            label={t('profile.currentPassword')}
            password
            value={current}
            onChangeText={(text) => {
              setCurrent(text);
              setCurrentError(null);
            }}
            error={currentError === null ? undefined : t(`profile.${currentError}`)}
          />
          <TextField
            testID="profile-new-password"
            label={t('profile.newPassword')}
            password
            value={next}
            onChangeText={(text) => {
              setNext(text);
              setNextError(null);
            }}
            error={nextError === null ? undefined : t(`profile.${nextError}`)}
            below={<PasswordRules password={next} showErrors={nextError !== null} />}
          />
          {result !== null ? (
            <Notice
              testID="profile-password-result"
              tone={result === 'saved' ? 'info' : 'error'}
              message={t(result === 'saved' ? 'profile.passwordSaved' : 'profile.failed')}
            />
          ) : null}
          <Button
            testID="profile-save-password"
            label={t('profile.savePassword')}
            busy={busy}
            onPress={() => {
              void save();
            }}
          />
        </View>

        <Button
          testID="profile-logout"
          variant="secondary"
          label={t('profile.logout')}
          onPress={() => {
            void signOut().then(() => {
              router.dismissTo('/');
            });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
});
