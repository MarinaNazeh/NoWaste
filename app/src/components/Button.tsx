// Primary, secondary and text-link buttons with clear pressed, disabled and busy states (NFR-07a).
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, minTouchSize, radius, spacing, type ColorName } from '@/theme';

type Variant = 'primary' | 'secondary' | 'link';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Shown instead of the label while busy, for example "Creating your account…". */
  busyLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const textColor: Record<Variant, ColorName> = {
  primary: 'onPrimary',
  secondary: 'primary',
  link: 'primary',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  busyLabel,
  busy = false,
  disabled = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const inactive = disabled || busy;
  const shownLabel = busy && busyLabel !== undefined ? busyLabel : label;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && variant === 'primary' && styles.primaryPressed,
        pressed && variant !== 'primary' && styles.lightPressed,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {busy ? <ActivityIndicator color={colors[textColor[variant]]} /> : null}
        <AppText
          variant="label"
          color={textColor[variant]}
          center
          style={variant === 'link' && styles.linkText}
        >
          {shownLabel}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize + 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  link: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'transparent',
  },
  lightPressed: {
    backgroundColor: colors.accent,
  },
  inactive: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
