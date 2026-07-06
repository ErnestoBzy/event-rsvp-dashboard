'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentRole } from '@/lib/supabase';
import { useT, type TKey } from '@/lib/i18n';

const DISHES = [
  'Kartoffelsalat',
  'Nudelsalat',
  'Cheesecake',
  'Obstsalat',
  'Käsekuchen',
  'Zwiebelkuchen',
  'Gurkensalat',
  'Hummus',
];

const STATUS_OPTIONS: { value: 'yes' | 'maybe' | 'no'; key: TKey }[] = [
  { value: 'yes', key: 'rsvp.status.yes' },
  { value: 'maybe', key: 'rsvp.status.maybe' },
  { value: 'no', key: 'rsvp.status.no' },
];

function InvitationBody() {
  const { t } = useT();
  return (
    <>
      <p className="text-sm text-dim leading-relaxed">
        {t('rsvp.para1')} <span className="text-accent">{t('rsvp.para1.linkText')}</span> {t('rsvp.para1.end')}
      </p>
      <p className="text-sm text-dim leading-relaxed">
        {t('rsvp.para2.start')} <span className="text-accent">{t('rsvp.para2.accent')}</span> {t('rsvp.para2.end')}
      </p>
      <p className="text-sm text-dim leading-relaxed">
        {t('rsvp.para3.start')} <span className="text-accent">{t('rsvp.para3.accent1')}</span>{t('rsvp.para3.middle')} <span className="text-accent">{t('rsvp.para3.accent2')}</span>!
      </p>
    </>
  );
}

export default function RSVPFormPage() {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('yes');
  const [guestCount, setGuestCount] = useState(1);
  const [bringing, setBringing] = useState('');
  const [dishIndex, setDishIndex] = useState(0);
  const [dishVisible, setDishVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getCurrentRole().then((role) => {
      if (!role) router.replace('/');
    });
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDishVisible(false);
      setTimeout(() => {
        setDishIndex((i) => (i + 1) % DISHES.length);
        setDishVisible(true);
      }, 280);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: insertError } = await supabase.from('rsvp_responses').insert({
      name,
      status,
      guest_count: guestCount,
      bringing: bringing || null,
    });
    if (insertError) {
      setError(t('rsvp.submitError'));
      setLoading(false);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-base">
        <header className="px-8 md:px-14 py-6 flex items-center justify-between flex-shrink-0 h-[60px]" />
        <main className="flex-1 flex items-center justify-center px-8 md:px-14">
          <div className="w-full max-w-xl mx-auto">
            <h1 className="font-medium leading-[1.1] text-accent text-5xl md:text-6xl mb-8 fade-in-up" style={{ animationDelay: '0.1s' }}>
              {t('rsvp.thanksLine1')}<br />
              <span className="gradient-text">{t('rsvp.thanksLine2')}</span>
            </h1>
            <p className="text-dim leading-relaxed mb-10 max-w-sm fade-in-up" style={{ animationDelay: '0.4s' }}>
              {t('rsvp.thanksBody')}
            </p>
            <div className="fade-in-up" style={{ animationDelay: '0.7s' }}>
              <Link
                href="/guest/photos"
                className="text-sm font-medium tracking-wide hover:opacity-50 transition-opacity"
              >
                {t('rsvp.toPhotoUpload')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-base">

      {/* Left panel — invitation context */}
      <div className="hidden md:flex md:w-[45%] flex-col border-r border-line flex-shrink-0">
        <div className="px-8 md:px-14 py-6 flex-shrink-0 h-[60px]" />
        <div className="flex-1 flex flex-col justify-center px-8 md:px-14 pb-10">
          <p className="text-xs tracking-widest text-dim uppercase mb-8 fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('rsvp.invitationLabel')}
          </p>

          <h1 className="font-medium leading-[1.1] text-accent text-4xl lg:text-5xl mb-10">
            <span className="block fade-in-up" style={{ animationDelay: '0.15s' }}>{t('rsvp.day')}</span>
            <span className="block fade-in-up" style={{ animationDelay: '0.35s' }}>
              <span className="gradient-text">{t('rsvp.date')}</span>
            </span>
          </h1>

          <div className="space-y-4 max-w-md fade-in-up" style={{ animationDelay: '0.6s' }}>
            <InvitationBody />
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="px-8 md:px-14 py-6 md:hidden flex-shrink-0 h-[60px]" />

        {/* Mobile-only invitation context (visible below md only) */}
        <div className="md:hidden px-8 pb-2 pt-2">
          <p className="text-xs tracking-widest text-dim uppercase mb-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('rsvp.invitationLabel')}
          </p>
          <h1 className="font-medium leading-[1.1] text-accent text-4xl mb-8">
            <span className="block fade-in-up" style={{ animationDelay: '0.15s' }}>{t('rsvp.day')}</span>
            <span className="block fade-in-up" style={{ animationDelay: '0.35s' }}>
              <span className="gradient-text">{t('rsvp.date')}</span>
            </span>
          </h1>
          <div className="space-y-4 fade-in-up" style={{ animationDelay: '0.6s' }}>
            <InvitationBody />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 md:px-12 lg:px-16 py-10">
          <div className="max-w-md w-full">

            <p className="text-xs tracking-widest text-dim uppercase mb-10 fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('rsvp.rsvpLabel')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-9">

              {/* Name */}
              <div className="fade-in-up" style={{ animationDelay: '0.35s' }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('rsvp.namePlaceholder')}
                  required
                  disabled={loading}
                  className="minimal !text-base"
                />
              </div>

              {/* Status — minimal radio */}
              <div className="fade-in-up" style={{ animationDelay: '0.5s' }}>
                <label className="block text-xs tracking-widest text-dim uppercase mb-3">
                  {t('rsvp.attendance')}
                </label>
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-x-6 md:gap-y-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={status === opt.value}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={loading}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full transition-colors ${
                        status === opt.value ? 'bg-accent' : 'bg-line group-hover:bg-line-hover'
                      }`} />
                      <span className={`text-sm transition-colors ${
                        status === opt.value ? 'text-accent' : 'text-dim'
                      }`}>{t(opt.key)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Guest count */}
              <div className="fade-in-up" style={{ animationDelay: '0.65s' }}>
                <label className="block text-xs tracking-widest text-dim uppercase mb-3">
                  {t('rsvp.guests')}
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                    disabled={loading || guestCount <= 1}
                    className="w-7 h-7 text-dim hover:text-accent transition disabled:opacity-25 text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="text-xl font-medium w-5 text-center text-accent">{guestCount}</span>
                  <button
                    type="button"
                    onClick={() => setGuestCount((n) => Math.min(20, n + 1))}
                    disabled={loading || guestCount >= 20}
                    className="w-7 h-7 text-dim hover:text-accent transition disabled:opacity-25 text-lg leading-none"
                  >
                    +
                  </button>
                  <span className="text-sm text-dim ml-2">
                    {guestCount === 1 ? t('rsvp.person') : t('rsvp.people')}
                  </span>
                </div>
              </div>

              {/* Bringing — animated placeholder serves as label */}
              <div className="fade-in-up" style={{ animationDelay: '0.8s' }}>
                <div className="relative min-h-[3.5rem] md:min-h-0">
                  <input
                    type="text"
                    value={bringing}
                    onChange={(e) => setBringing(e.target.value)}
                    disabled={loading}
                    className="minimal !text-base"
                  />
                  {!bringing && (
                    <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none text-base leading-tight md:whitespace-nowrap md:leading-normal overflow-hidden pl-0">
                      <span className="text-[#b8b8b8]">{t('rsvp.bringingStart')} </span>
                      <span
                        className="gradient-text font-medium transition-opacity duration-300"
                        style={{ opacity: dishVisible ? 1 : 0 }}
                      >
                        {DISHES[dishIndex]}
                      </span>
                      <span className="text-[#b8b8b8]">.</span>
                      <span className="text-[#b8b8b8] block md:inline"> {t('rsvp.bringingEnd')}</span>
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="pt-2 fade-in-up" style={{ animationDelay: '0.95s' }}>
                <button
                  type="submit"
                  disabled={loading || !name}
                  className="text-lg font-medium tracking-wide hover:opacity-50 transition-opacity disabled:opacity-25"
                >
                  {loading ? '…' : t('rsvp.submit')}
                </button>
              </div>

            </form>

            <div className="mt-10 fade-in-up" style={{ animationDelay: '1.1s' }}>
              <Link
                href="/guest/photos"
                className="text-xs tracking-widest text-dim uppercase hover:text-accent transition"
              >
                {t('rsvp.toPhotoUpload')}
              </Link>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
