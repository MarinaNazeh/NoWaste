// D-105: what a rejected vendor or partner sees under the Rejected status: the administrator's reason and note, the
// support contact (settings row SUPPORT-CONTACT) and "Fix and send again", which opens the application form filled in
// with what they sent (register.tsx with reapply=1).
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getMyApplication, type MyApplication } from '@/api/client';
import { roleGroupOf, useAuth } from '@/auth/AuthProvider';
import { useLanguage } from '@/i18n/LanguageProvider';
import { spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export function RejectedApplication() {
  const { t } = useTranslation();
  const router = useRouter();
  const { direction } = useLanguage();
  const { token, user } = useAuth();
  const [application, setApplication] = useState<MyApplication | null>(null);

  useEffect(() => {
    if (token === null) return;
    let active = true;
    void getMyApplication(token)
      .then((result) => {
        if (active && result.kind === 'ok') setApplication(result.application);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  const role = user === null ? 'vendor' : roleGroupOf(user.role) === 'partner' ? 'partner' : 'vendor';
  const rejection = application?.rejection ?? null;

  return (
    <View testID="application-rejection" style={[styles.box, { direction }]}>
      {rejection !== null ? (
        <>
          <AppText variant="label">
            {t('rejection.yourReason', { reason: t(`rejection.reasons.${rejection.reason}`) })}
          </AppText>
          {rejection.note !== null ? (
            <AppText>{t('rejection.yourNote', { note: rejection.note })}</AppText>
          ) : null}
        </>
      ) : null}
      {application !== null ? (
        <AppText color="textMuted">
          {t('rejection.support', { email: application.supportContact.email })}
        </AppText>
      ) : null}
      <Button
        testID="application-fix"
        label={t('rejection.fixAndSend')}
        onPress={() => {
          router.push({ pathname: '/register', params: { role, reapply: '1' } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
  },
});
