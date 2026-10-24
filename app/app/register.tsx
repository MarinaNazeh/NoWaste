// Register screen (US-01): a consumer signs up with an email address or a mobile number and a password
// (FR-ACC-01). Invalid fields are marked (E-ACC-02, IF-UI-06); an already registered email or phone offers
// Log in and Reset password (E-ACC-01). The same shared validator runs here and on the server.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { validateRegistration, type RegistrationField } from '@nowaste/shared';
import { registerConsumer } from '@/api/client';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Notice';
import { PasswordRules } from '@/components/PasswordRules';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { spacing } from '@/theme';

type Method = 'email' | 'phone';
type Problem = 'unreachable' | 'unexpected';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguage();

  const [method, setMethod] = useState<Method>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState<RegistrationField[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<Method | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [showResetNote, setShowResetNote] = useState(false);
  const [showLoginNote, setShowLoginNote] = useState(false);

  function clearField(field: RegistrationField) {
    setInvalid((fields) => fields.filter((f) => f !== field));
  }

  function identifierError(): string | undefined {
    if (!invalid.includes(method)) return undefined;
    const blank = identifier.trim() === '';
    if (method === 'email') return blank ? t('errors.emailRequired') : t('errors.emailInvalid');
    return blank ? t('errors.phoneRequired') : t('errors.phoneInvalid');
  }

  async function submit() {
    setDuplicate(null);
    setProblem(null);
    setShowResetNote(false);
    setShowLoginNote(false);

    const body = {
      ...(method === 'email' ? { email: identifier } : { phone: identifier }),
      password,
      language,
    };
    const check = validateRegistration(body);
    if (!check.ok) {
      setInvalid(check.fields);
      return;
    }
    setInvalid([]);
    setSubmitting(true);
    const result = await registerConsumer(body);
    setSubmitting(false);

    switch (result.kind) {
      case 'created':
        router.replace('/registered');
        break;
      case 'invalid':
        setInvalid(result.fields);
        break;
      case 'duplicate':
        setDuplicate(result.field);
        break;
      default:
        setProblem(result.kind);
    }
  }

  return (
    <Screen scroll>
      <AppText color="textMuted">{t('register.intro')}</AppText>

      {invalid.length > 0 ? (
        <Notice
          testID="register-errors"
          tone="error"
          title={t('errors.fixFields')}
          message={invalid.includes('language') ? t('errors.languageInvalid') : undefined}
        />
      ) : null}

      {duplicate !== null ? (
        <Notice
          testID="register-duplicate"
          tone="error"
          title={duplicate === 'email' ? t('duplicate.emailTitle') : t('duplicate.phoneTitle')}
          message={t('duplicate.message')}
        >
          <View style={styles.duplicateActions}>
            {/* Log in is US-04 (turn 3); password reset is US-05, whose SRS 6.2 fallback is a reset by the team. */}
            <Button
              variant="secondary"
              label={t('duplicate.login')}
              accessibilityHint={t('welcome.loginHint')}
              onPress={() => {
                setShowLoginNote(true);
              }}
            />
            <Button
              variant="link"
              label={t('duplicate.resetPassword')}
              onPress={() => {
                setShowResetNote(true);
              }}
            />
          </View>
          {showLoginNote ? <AppText variant="caption">{t('welcome.loginComingSoon')}</AppText> : null}
          {showResetNote ? <AppText variant="caption">{t('duplicate.resetContact')}</AppText> : null}
        </Notice>
      ) : null}

      {problem !== null ? (
        <Notice
          testID="register-problem"
          tone="error"
          message={problem === 'unreachable' ? t('errors.unreachable') : t('errors.unexpected')}
        />
      ) : null}

      <View style={styles.group}>
        <AppText variant="label">{t('register.methodLabel')}</AppText>
        <SegmentedControl<Method>
          options={[
            { value: 'email', label: t('register.methodEmail') },
            { value: 'phone', label: t('register.methodPhone') },
          ]}
          value={method}
          onChange={(next) => {
            setMethod(next);
            setIdentifier('');
            setDuplicate(null);
            setInvalid((fields) => fields.filter((f) => f !== 'email' && f !== 'phone'));
          }}
          accessibilityLabel={t('register.methodLabel')}
        />
      </View>

      {method === 'email' ? (
        <TextField
          key="email"
          testID="register-email"
          label={t('register.emailLabel')}
          placeholder={t('register.emailPlaceholder')}
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            clearField('email');
          }}
          error={identifierError()}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
      ) : (
        <TextField
          key="phone"
          testID="register-phone"
          label={t('register.phoneLabel')}
          placeholder={t('register.phonePlaceholder')}
          hint={t('register.phoneHint')}
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            clearField('phone');
          }}
          error={identifierError()}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={11}
          returnKeyType="next"
        />
      )}

      <TextField
        testID="register-password"
        label={t('register.passwordLabel')}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearField('password');
        }}
        error={invalid.includes('password') ? t('errors.passwordInvalid') : undefined}
        password
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => {
          void submit();
        }}
        below={<PasswordRules password={password} showErrors={invalid.includes('password')} />}
      />

      <View style={styles.submit}>
        <Button
          testID="register-submit"
          label={t('register.submit')}
          busyLabel={t('register.submitting')}
          busy={submitting}
          onPress={() => {
            void submit();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  duplicateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
