// NFR-07b: text has a contrast ratio of at least 4.5:1 against its background.
import { colors, textColorPairs } from '@/theme';
import { contrastRatio } from '@/theme/contrast';

describe('NFR-07b text contrast', () => {
  test('NFR-07b the contrast calculation matches the known black-on-white ratio of 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  test.each(textColorPairs)(
    'NFR-07b %s text on %s has a contrast ratio of at least 4.5:1',
    (foreground, background) => {
      expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
    },
  );
});
