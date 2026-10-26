// NoWaste visual identity. The primary green is the background colour of the official logo (assets/logo.png).
// Every text colour is paired with the backgrounds it is used on; NFR-07b requires a contrast ratio of at least 4.5:1,
// and app/__tests__/theme.test.ts checks each pair in `textColorPairs`.

export const colors = {
  primary: '#2C5F2D',
  primaryPressed: '#224A23',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#E2EDDD',
  background: '#FAF7F0',
  surface: '#FFFFFF',
  accent: '#E7F1E4',
  text: '#1C2A1D',
  textMuted: '#4D5A4E',
  // Dark enough for 4.5:1 also on the red background of an invalid field (was #667267: 4.41:1 there).
  placeholder: '#5F6B60',
  border: '#CFC8B6',
  error: '#B42318',
  errorBackground: '#FDECEA',
  success: '#2C5F2D',
  // Decorative only (never used for text): the light leaf green of the logo.
  leaf: '#6BAF5B',
} as const;

export type ColorName = keyof typeof colors;

/** Text colour / background colour pairs that appear in the app. */
export const textColorPairs: readonly [foreground: ColorName, background: ColorName][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'accent'],
  // Typed text and notice messages inside an invalid field or an error notice.
  ['text', 'errorBackground'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  // Password rules title on the light-green rules box.
  ['textMuted', 'accent'],
  ['placeholder', 'surface'],
  // Placeholder of an empty field that is marked invalid.
  ['placeholder', 'errorBackground'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onPrimaryMuted', 'primary'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'accent'],
  // Show/Hide in an invalid password field and the "Reset password" link in the error notice.
  ['primary', 'errorBackground'],
  // The white "!" mark next to each error message.
  ['onPrimary', 'error'],
  ['error', 'surface'],
  ['error', 'background'],
  ['error', 'errorBackground'],
  // A password rule that is not met after a failed submit.
  ['error', 'accent'],
];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const typography = {
  title: { fontSize: 30, fontWeight: '700' },
  heading: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 14, fontWeight: '400' },
} as const;

export type TextVariant = keyof typeof typography;

/** Minimum touch target size (pixels) for buttons and inputs. */
export const minTouchSize = 48;
