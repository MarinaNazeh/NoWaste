// Arabic and English texts (NFR-06). Every user-facing text lives in en.json and ar.json; no hard-coded text.
// Switching language and the right-to-left layout are built in US-09 (FR-ACC-09, IF-UI-02, IF-UI-03).
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

export const supportedLanguages = ['ar', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  // Temporary default until US-09 decides the first-launch language (see PROGRESS.md, Open questions).
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
