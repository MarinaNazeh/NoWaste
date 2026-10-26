// Labelled text input. An invalid field gets a red border and a message under it (IF-UI-06), and screen readers
// hear the label, the hint and the error (NFR-07a).
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  error?: string;
  hint?: string;
  /** Password field with a show/hide control. */
  password?: boolean;
  /** Extra content under the field, for example the password rules. */
  below?: ReactNode;
}

export function TextField({ label, error, hint, password = false, below, ...inputProps }: TextFieldProps) {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const invalid = error !== undefined;

  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.inputRow, focused && styles.inputRowFocused, invalid && styles.inputRowInvalid]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={invalid ? error : hint}
          accessibilityState={{ disabled: inputProps.editable === false }}
          aria-invalid={invalid}
          secureTextEntry={password && !visible}
          placeholderTextColor={colors.placeholder}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={[
            styles.input,
            { writingDirection: direction, textAlign: direction === 'rtl' ? 'right' : 'left' },
          ]}
        />
        {password ? (
          <Pressable
            onPress={() => {
              setVisible((value) => !value);
            }}
            accessibilityRole="button"
            accessibilityLabel={visible ? t('register.hidePasswordLabel') : t('register.showPasswordLabel')}
            hitSlop={8}
            style={styles.toggle}
          >
            <AppText variant="label" color="primary">
              {visible ? t('register.hidePassword') : t('register.showPassword')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {hint !== undefined && !invalid ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
      {invalid ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <View style={styles.errorBadge}>
            <AppText variant="caption" color="onPrimary" center style={styles.errorBadgeText}>
              !
            </AppText>
          </View>
          <AppText variant="caption" color="error" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
      {below}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchSize + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputRowInvalid: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.errorBackground,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  toggle: {
    minHeight: minTouchSize - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  errorBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    justifyContent: 'center',
    marginTop: 1,
  },
  errorBadgeText: {
    fontWeight: '700',
    lineHeight: 18,
  },
  errorText: {
    flex: 1,
  },
});
