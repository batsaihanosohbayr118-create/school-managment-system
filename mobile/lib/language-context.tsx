import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Language } from '@shared/i18n-tables';
import { translations } from '@shared/i18n-tables';

const STORAGE_KEY = 'mobile_language';

type LanguageState = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Shorthand for translations[language] — every screen reads through this. */
  t: (typeof translations)['en'];
};

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'mn') setLanguageState(stored);
    });
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider.');
  return context;
}
