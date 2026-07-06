'use client';

import { useT } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-xs tracking-widest uppercase select-none">
      <button
        onClick={() => setLang('de')}
        className={lang === 'de' ? 'text-accent' : 'text-dim hover:text-accent transition-colors'}
        aria-label="Deutsch"
      >
        DE
      </button>
      <span className="text-line">/</span>
      <button
        onClick={() => setLang('en')}
        className={lang === 'en' ? 'text-accent' : 'text-dim hover:text-accent transition-colors'}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
