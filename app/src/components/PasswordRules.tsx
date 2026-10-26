// The password rules shown under the password field (decision D-11, TBD-4). Each rule shows whether it is met.
// The rules come from the shared validator, the same one the server uses.
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES, checkPasswordRules } from '@nowaste/shared';
import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme';

interface PasswordRulesProps {
  password: string;
  /** After a failed submit, unmet rules are shown in the error colour. */
  showErrors: boolean;
}

export function PasswordRules({ password, showErrors }: PasswordRulesProps) {
  const { t } = useTranslation();
  const result = checkPasswordRules(password);
  const rules = [
    { met: result.minLength, text: t('register.ruleMinLength', { count: PASSWORD_RULES.minLength }) },
    { met: result.hasLetter, text: t('register.ruleLetter') },
    { met: result.hasDigit, text: t('register.ruleDigit') },
  ];

  return (
    <View style={styles.box}>
      <AppText variant="caption" color="textMuted">
        {t('register.rulesTitle')}
      </AppText>
      {rules.map((rule) => {
        const failed = showErrors && !rule.met;
        return (
          <View
            key={rule.text}
            style={styles.row}
            accessible
            accessibilityLabel={`${rule.text}, ${rule.met ? t('register.ruleMet') : t('register.ruleNotMet')}`}
          >
            <View style={[styles.dot, rule.met ? styles.dotMet : failed ? styles.dotFailed : styles.dotOpen]}>
              {rule.met ? (
                <AppText variant="caption" color="onPrimary" center style={styles.check}>
                  ✓
                </AppText>
              ) : null}
            </View>
            <AppText
              variant="caption"
              color={rule.met ? 'primary' : failed ? 'error' : 'textMuted'}
              style={styles.ruleText}
            >
              {rule.text}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  dotMet: {
    backgroundColor: colors.primary,
  },
  dotOpen: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  dotFailed: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  // The label takes the rest of the row. Sized only to its own measured width, the last word of
  // "At least one letter" / "At least one number" was cut off on the phone (manual test, 2026-10-24).
  ruleText: {
    flex: 1,
  },
  check: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
