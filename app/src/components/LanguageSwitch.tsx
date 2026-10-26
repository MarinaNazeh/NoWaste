// US-09: English / العربية switch (FR-ACC-09, IF-UI-02). Shown on the Welcome screen and in every screen header.
// Each language name is written in its own language, so it can be found whatever language is active.
import { useTranslation } from 'react-i18next';
import type { Language } from '@nowaste/shared';
import { useLanguage } from '@/i18n/LanguageProvider';
import { SegmentedControl } from './SegmentedControl';

interface LanguageSwitchProps {
  tone?: 'light' | 'onDark';
  compact?: boolean;
}

export function LanguageSwitch({ tone = 'light', compact = false }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <SegmentedControl<Language>
      options={[
        { value: 'en', label: t('language.en') },
        { value: 'ar', label: t('language.ar') },
      ]}
      value={language}
      onChange={(next) => {
        void setLanguage(next);
      }}
      accessibilityLabel={t('language.groupLabel')}
      accessibilityHint={t('language.optionHint')}
      tone={tone}
      compact={compact}
    />
  );
}
