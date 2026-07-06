'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, ADMIN_EMAIL } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

export default function AdminLoginPage() {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });
    if (signInError) {
      setError(t('home.wrongPassword'));
      setLoading(false);
      return;
    }
    router.push('/admin/dashboard');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-base">

      {/* Split layout */}
      <main className="flex-1 grid md:grid-cols-2 overflow-hidden">

        {/* Left — branding */}
        <div className="hidden md:flex flex-col justify-center px-12 py-12 border-r border-line bg-surface">
          <div>
            <h2 className="text-5xl font-light tracking-tight leading-tight mb-6 text-accent">
              {t('admin.headline')}
            </h2>
            <p className="text-dim leading-relaxed max-w-xs">
              {t('admin.subtitle')}
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center px-8 md:px-12 py-12">
          <div className="max-w-sm w-full">

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs tracking-widest text-dim uppercase mb-3">
                  {t('admin.passwordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="·····"
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full border border-accent text-accent text-xs tracking-widest uppercase py-4 px-6 hover:bg-accent hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? t('admin.signingIn') : t('admin.signIn')}
              </button>
            </form>

          </div>
        </div>

      </main>

    </div>
  );
}
