// A row of mutually exclusive options (used for the language switch and for "Email / Mobile number").
// The row follows the layout direction, so in Arabic the first option sits on the right.
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, minTouchSize, radius, spacing } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** "onDark" is for the green header area of the Welcome screen. */
  tone?: 'light' | 'onDark';
  compact?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  accessibilityHint,
  tone = 'light',
  compact = false,
}: SegmentedControlProps<T>) {
  const onDark = tone === 'onDark';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, onDark ? styles.trackOnDark : styles.trackLight]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              compact && styles.segmentCompact,
              selected && (onDark ? styles.selectedOnDark : styles.selectedLight),
              pressed && !selected && styles.pressed,
            ]}
          >
            <AppText
              variant={compact ? 'caption' : 'label'}
              center
              color={selected ? (onDark ? 'primary' : 'onPrimary') : onDark ? 'onPrimary' : 'text'}
              style={styles.segmentText}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  trackLight: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackOnDark: {
    backgroundColor: colors.primaryPressed,
  },
  segment: {
    flex: 1,
    minHeight: minTouchSize - 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentCompact: {
    flex: 0,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  selectedLight: {
    backgroundColor: colors.primary,
  },
  selectedOnDark: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  segmentText: {
    fontWeight: '600',
  },
});
