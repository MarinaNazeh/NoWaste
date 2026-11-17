// Warning before the no-show block (asked for by Maryam on 2026-11-14; BR-07 / FR-RES-13). The texts the customer
// sees, in Arabic and English, with the BR-07 numbers filled in. The screens that show them come with US-28 / US-35.
import i18n from '../src/i18n';

const numbers = { count: 1, limit: 3, days: 30, blockDays: 14 };

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BR-07 warning before the no-show block: texts', () => {
  test.each(['notice', 'warning', 'blocked'])(
    'BR-07 the %s text has the BR-07 numbers in English',
    (level) => {
      const text = i18n.t(`noShow.${level}`, numbers);

      expect(text).not.toContain('{{');
      expect(text).toContain('30');
    },
  );

  test('BR-07 the warning says the next missed pickup blocks no-card reserving for the BR-07 days', () => {
    expect(i18n.t('noShow.warning', numbers)).toBe(
      'Warning: one more missed pickup within 30 days and you cannot reserve without a card for 14 days.',
    );
  });

  test.each(['notice', 'warning', 'blocked'])(
    'BR-07 the %s text is in Arabic with Arabic-Indic digits',
    async (level) => {
      await i18n.changeLanguage('ar');
      const text = i18n.t(`noShow.${level}`, numbers);

      expect(text).not.toContain('{{');
      expect(text).toContain('٣٠');
      expect(text).not.toMatch(/[0-9]/);
    },
  );
});
