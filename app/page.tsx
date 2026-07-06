'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, GUEST_EMAIL } from '@/lib/supabase';
import { useT, type TKey } from '@/lib/i18n';

const VERB_KEYS: TKey[] = [
  'home.verb.feiern',
  'home.verb.lachen',
  'home.verb.tanzen',
  'home.verb.anstoßen',
  'home.verb.genießen',
];

export default function Home() {
  const { t, lang } = useT();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verbIndex, setVerbIndex] = useState(0);
  const [verbVisible, setVerbVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setVerbVisible(false);
      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERB_KEYS.length);
        setVerbVisible(true);
      }, 280);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: GUEST_EMAIL,
      password,
    });
    if (signInError) {
      setError(t('home.wrongPassword'));
      setLoading(false);
      return;
    }
    router.push('/guest/rsvp');
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col overflow-hidden bg-base">

      {/* Top bar */}
      <header className="px-8 md:px-14 py-6 flex items-center justify-end flex-shrink-0">
        <Link href="/admin" aria-label="Admin">
          <span className="w-1.5 h-1.5 rounded-full bg-accent block opacity-20 hover:opacity-100 transition-opacity" />
        </Link>
      </header>

      {/* Hero — block centered, text left-aligned within */}
      <main className="flex-1 flex items-center justify-center px-8 md:px-14">
        <div className="text-left">

          <h1 className="font-medium leading-[1.1] whitespace-nowrap text-accent text-5xl md:text-6xl lg:text-7xl">
            <span className="block fade-in-up" style={{ animationDelay: '0.05s' }}>{t('home.line1')}</span>
            {lang === 'en' ? (
              <>
                <span className="block fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <span
                    className="gradient-text inline-block transition-opacity duration-300"
                    style={{ opacity: verbVisible ? 1 : 0 }}
                  >
                    {t(VERB_KEYS[verbIndex])}.
                  </span>
                </span>
                <span className="block fade-in-up" style={{ animationDelay: '0.55s' }}>{t('home.line2')}</span>
              </>
            ) : (
              <>
                <span className="block fade-in-up" style={{ animationDelay: '0.3s' }}>{t('home.line2')}</span>
                <span className="block fade-in-up" style={{ animationDelay: '0.55s' }}>
                  <span
                    className="gradient-text inline-block transition-opacity duration-300"
                    style={{ opacity: verbVisible ? 1 : 0 }}
                  >
                    {t(VERB_KEYS[verbIndex])}.
                  </span>
                </span>
              </>
            )}
          </h1>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-8 mt-10 fade-in-up"
            style={{ animationDelay: '1.1s' }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('home.passwordPlaceholder')}
              disabled={loading}
              autoFocus
              className="minimal w-48 !text-base"
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="text-sm font-medium tracking-wide hover:opacity-50 transition-opacity disabled:opacity-25 whitespace-nowrap"
            >
              {loading ? '…' : t('home.next')}
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-500 mt-3">{error}</p>
          )}

        </div>
      </main>


    </div>
  );
}
