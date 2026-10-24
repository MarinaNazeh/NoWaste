// Saves the chosen language on the device, so it survives closing the app (US-09).
// This is device storage, not the account: it works before registration and login (FR-ACC-09, IF-UI-02).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, type Language } from '@nowaste/shared';
import { DEFAULT_LANGUAGE } from './index';

export const LANGUAGE_STORAGE_KEY = 'nowaste.language';

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export async function loadSavedLanguage(): Promise<Language> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function saveLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The language still changes for this session; it is just not remembered.
  }
}
