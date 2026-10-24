// Arabic and English texts (NFR-06). Every user-facing text lives in en.json and ar.json; no hard-coded text.
// The current language and the layout direction are managed by LanguageProvider (US-09, FR-ACC-09).
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '@nowaste/shared';
import ar from './ar.json';
import en from './en.json';

export type { Language };

/** Used when no language has been saved on the device yet (decision D-15, needs team approval). */
export const DEFAULT_LANGUAGE: Language = 'en';

export const translations = { ar, en } as const;

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;
