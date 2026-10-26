// US-09: the current language and layout direction for the whole app (FR-ACC-09, IF-UI-02, IF-UI-03, NFR-06).
//
// Arabic is right-to-left. The direction is applied by the app itself (Screen component and expo-router's
// LocaleProvider), not with I18nManager.forceRTL + reload, because Expo's docs state that forceRTL does not work in
// Expo Go and Updates.reloadAsync() cannot be used in Expo Go or development mode (decision D-14).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language } from '@nowaste/shared';
import i18n from './index';
import { loadSavedLanguage, saveLanguage } from './languageStorage';

export type Direction = 'ltr' | 'rtl';

export function directionOf(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr';
}

interface LanguageContextValue {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    let active = true;
    void loadSavedLanguage().then(async (saved) => {
      await i18n.changeLanguage(saved);
      if (active) {
        setLanguageState(saved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    await i18n.changeLanguage(next);
    setLanguageState(next);
    await saveLanguage(next);
  }, []);

  const value = useMemo<LanguageContextValue | null>(
    () =>
      language === null
        ? null
        : { language, direction: directionOf(language), isRTL: language === 'ar', setLanguage },
    [language, setLanguage],
  );

  // Render nothing until the saved language is known, so the first screen never flashes in the wrong language.
  if (value === null) {
    return null;
  }
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (value === null) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return value;
}
