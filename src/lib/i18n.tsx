import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'ko' | 'en';
const STORAGE_KEY = 'matcha_lang';

function detectLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'ko' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

type TFn = (ko: string, en: string) => string;

const LanguageContext = createContext<{ lang: Lang; toggleLang: () => void; t: TFn }>({
  lang: 'ko',
  toggleLang: () => {},
  t: (ko) => ko,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const t: TFn = (ko, en) => (lang === 'ko' ? ko : en);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang: () => setLang(p => (p === 'ko' ? 'en' : 'ko')), t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
