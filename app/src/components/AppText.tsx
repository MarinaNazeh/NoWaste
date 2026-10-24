// All text in the app goes through AppText, so it follows the reading direction of the current language (NFR-06).
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, typography, type ColorName, type TextVariant } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorName;
  center?: boolean;
}

export function AppText({ variant = 'body', color = 'text', center = false, style, ...rest }: AppTextProps) {
  const { direction } = useLanguage();
  const base = typography[variant];
  const alignment: TextStyle = {
    writingDirection: direction,
    // The only place where a side is chosen: it is computed from the language, so text always starts on the
    // reading side (right in Arabic, left in English). Layout spacing elsewhere uses start/end.
    textAlign: center ? 'center' : direction === 'rtl' ? 'right' : 'left',
  };
  return (
    <Text
      style={[
        base,
        { color: colors[color], lineHeight: Math.round(base.fontSize * 1.45) },
        alignment,
        styles.text,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    flexShrink: 1,
  },
});
