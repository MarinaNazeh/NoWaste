// A short message box: "error" for problems that block the form, "info" for neutral notes.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme';

interface NoticeProps {
  tone: 'error' | 'info';
  title?: string;
  message?: string;
  children?: ReactNode;
  testID?: string;
}

export function Notice({ tone, title, message, children, testID }: NoticeProps) {
  const isError = tone === 'error';
  return (
    <View
      testID={testID}
      accessibilityRole={isError ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[styles.box, isError ? styles.error : styles.info]}
    >
      {title !== undefined ? (
        <AppText variant="label" color={isError ? 'error' : 'primary'}>
          {title}
        </AppText>
      ) : null}
      {message !== undefined ? <AppText variant="caption">{message}</AppText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderStartWidth: 4,
  },
  error: {
    backgroundColor: colors.errorBackground,
    borderStartColor: colors.error,
  },
  info: {
    backgroundColor: colors.accent,
    borderStartColor: colors.primary,
  },
});
