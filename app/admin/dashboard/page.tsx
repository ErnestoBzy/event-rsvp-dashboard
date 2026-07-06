'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentRole } from '@/lib/supabase';
import { buildGuestStatus, dedupeByName, normalize, type Guest, type Rsvp } from '@/lib/matching';
import { useT } from '@/lib/i18n';

type Summary = {
  total_responses: number;
  yes_responses: number;
  maybe_responses: number;
  no_responses: number;
  total_people_coming: number;
  total_people_maybe: number;
  total_people_declined: number;
  total_people_all_statuses: number;
};

type Filter = 'all' | 'yes' | 'no' | 'maybe';

const STATUS_COLOR: Record<Rsvp['status'], string> = {
  yes: 'text-green-600 bg-green-100',
  no: 'text-red-600 bg-red-100',
  maybe: 'text-amber-700 bg-amber-100',
};

export default function AdminDashboardPage() {
  const { t } = useT();
  const [responses, setResponses] = useState<Rsvp[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const role = await getCurrentRole();
      if (role !== 'admin') {
        router.replace('/admin');
        return;
      }
      await reload();
      setLoading(false);
    }
    fetchData();
  }, [router]);

  const reload = async () => {
    const [resp, gs] = await Promise.all([
      supabase
        .from('rsvp_responses')
        .select('id, name, status, bringing, guest_count, notes, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('guests').select('id, full_name, notes, children_count').order('full_name'),
    ]);

    if (resp.error || gs.error) {
      setError(t('dash.loadError'));
      return;
    }
    setResponses((resp.data || []) as Rsvp[]);
    setGuests((gs.data || []) as Guest[]);
  };

  // Deduplicate: if same person submits multiple times, only the latest counts
  const latestResponses = useMemo(() => dedupeByName(responses), [responses]);

  const { guestStatuses, unmatched } = useMemo(
    () => buildGuestStatus(guests, latestResponses),
    [guests, latestResponses]
  );

  // Stats computed from deduplicated responses (latest per person)
  const summary: Summary = useMemo(() => {
    const yes = latestResponses.filter((r) => r.status === 'yes');
    const maybe = latestResponses.filter((r) => r.status === 'maybe');
    const no = latestResponses.filter((r) => r.status === 'no');
    const sum = (rs: Rsvp[]) => rs.reduce((s, r) => s + (r.guest_count || 0), 0);
    return {
      total_responses: latestResponses.length,
      yes_responses: yes.length,
      maybe_responses: maybe.length,
      no_responses: no.length,
      total_people_coming: sum(yes),
      total_people_maybe: sum(maybe),
      total_people_declined: sum(no),
      total_people_all_statuses: sum(latestResponses),
    };
  }, [latestResponses]);

  const respondedCount = guestStatuses.filter((s) => s.rsvp !== null).length;

  // Total children among guests who confirmed (status 'yes')
  const totalChildren = useMemo(
    () =>
      guestStatuses
        .filter((s) => s.rsvp?.status === 'yes')
        .reduce((sum, s) => sum + (s.guest.children_count || 0), 0),
    [guestStatuses]
  );

  const bringings = useMemo(
    () =>
      latestResponses
        .filter((r) => r.status !== 'no' && r.bringing && r.bringing.trim())
        .map((r) => ({ id: r.id, name: r.name, bringing: r.bringing!.trim() })),
    [latestResponses]
  );

  const statusLabel = (s: Rsvp['status']) => t(`dash.status.${s}` as const);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGuestName.trim();
    if (!name) return;
    setAddingGuest(true);
    const { error: insErr } = await supabase.from('guests').insert({ full_name: name });
    if (insErr) {
      setError(t('dash.addGuestError'));
    } else {
      setNewGuestName('');
      await reload();
    }
    setAddingGuest(false);
  };

  // Optimistic local update so the stat reflects the new number instantly.
  const handleChildrenChange = (id: number, value: number) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, children_count: value } : g))
    );
  };

  // Persist the children count when the admin leaves the field.
  const handleChildrenBlur = async (id: number, value: number) => {
    const safe = Math.max(0, Math.min(20, Math.floor(value) || 0));
    await supabase.from('guests').update({ children_count: safe }).eq('id', id);
  };

  const handleDeleteGuest = async (id: number) => {
    if (!confirm(t('dash.confirmRemove'))) return;
    await supabase.from('guests').delete().eq('id', id);
    await reload();
  };

  const handleDeleteResponse = async (name: string) => {
    if (!confirm(t('dash.confirmDeleteResponse'))) return;
    const key = normalize(name);
    const ids = responses.filter((r) => normalize(r.name) === key).map((r) => r.id);
    if (ids.length === 0) return;
    await supabase.from('rsvp_responses').delete().in('id', ids);
    await reload();
  };

  const handleExportCSV = () => {
    const headers = [t('dash.col.name'), t('dash.col.status'), t('dash.col.pers'), t('dash.col.bringing'), 'Notes', t('dash.col.date')];
    const rows = filteredResponses.map((r) => [
      r.name,
      statusLabel(r.status),
      r.guest_count.toString(),
      r.bringing || '',
      r.notes || '',
      new Date(r.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResponses =
    filter === 'all' ? responses : responses.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <p className="text-dim text-sm">{t('dash.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <p className="text-xs tracking-widest text-dim uppercase mb-3">{t('dash.adminLabel')}</p>
            <h1 className="text-3xl font-light tracking-tight text-accent">{t('dash.headline')}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-dim hover:text-accent transition mt-1"
          >
            {t('dash.signOut')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <StatCard label={t('dash.stat.responses')} value={summary.total_responses} />
          <StatCard label={t('dash.stat.coming')} value={summary.total_people_coming} sub={t('dash.stat.people')} highlight />
          <StatCard label={t('dash.stat.children')} value={totalChildren} sub={t('dash.stat.childrenSub')} />
          <StatCard label={t('dash.stat.maybe')} value={summary.total_people_maybe} sub={t('dash.stat.people')} />
          <StatCard label={t('dash.stat.declined')} value={summary.total_people_declined} sub={t('dash.stat.people')} />
          <StatCard label={t('dash.stat.invited')} value={`${respondedCount} / ${guests.length}`} sub={t('dash.stat.responded')} />
        </div>

        {/* Mitbringsel / Buffet */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs tracking-widest text-dim uppercase">{t('dash.bringings')}</h2>
            {bringings.length > 0 && <span className="text-xs text-dim">{bringings.length}</span>}
          </div>
          {bringings.length === 0 ? (
            <p className="text-sm text-dim py-4">{t('dash.bringingsEmpty')}</p>
          ) : (
            <div className="bg-surface border border-line rounded-xl p-5">
              <ul className="divide-y divide-line">
                {bringings.map((b) => (
                  <li key={b.id} className="py-2 flex items-baseline justify-between gap-4 text-sm first:pt-0 last:pb-0">
                    <span className="text-accent">{b.bringing}</span>
                    <span className="text-xs text-dim whitespace-nowrap">{b.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Gästeliste */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs tracking-widest text-dim uppercase">{t('dash.guestList')}</h2>
            <span className="text-xs text-dim">{guests.length} {t('dash.invitedCount')}</span>
          </div>

          <form onSubmit={handleAddGuest} className="flex gap-3 mb-6">
            <input
              type="text"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              placeholder={t('dash.addGuestPlaceholder')}
              disabled={addingGuest}
              className="minimal !text-base flex-1"
            />
            <button
              type="submit"
              disabled={!newGuestName.trim() || addingGuest}
              className="text-sm font-medium tracking-wide hover:opacity-50 transition-opacity disabled:opacity-25 whitespace-nowrap"
            >
              {addingGuest ? '…' : t('dash.addGuest')}
            </button>
          </form>

          {guestStatuses.length === 0 ? (
            <p className="text-sm text-dim py-6 text-center">{t('dash.emptyGuestList')}</p>
          ) : (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.name')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.response')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.children')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.match')}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {guestStatuses.map(({ guest, rsvp, matchKind, matchReason }) => (
                    <tr key={guest.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-medium text-accent">{guest.full_name}</td>
                      <td className="px-5 py-3">
                        {rsvp ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[rsvp.status]}`}>
                            {statusLabel(rsvp.status)}
                            {rsvp.guest_count > 1 && ` (+${rsvp.guest_count - 1})`}
                          </span>
                        ) : (
                          <span className="text-xs text-dim">{t('dash.noResponse')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={guest.children_count ?? 0}
                          onChange={(e) =>
                            handleChildrenChange(guest.id, parseInt(e.target.value, 10) || 0)
                          }
                          onBlur={(e) =>
                            handleChildrenBlur(guest.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 bg-base border border-line rounded px-2 py-1 text-sm text-accent text-center focus:border-line-hover focus:outline-none"
                        />
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {matchKind === 'exact' && <span className="text-green-600">{t('dash.matchExact')}</span>}
                        {matchKind === 'fuzzy' && (
                          <span className="text-amber-700">
                            ? {matchReason} ({t('dash.matchAs')} &quot;{rsvp?.name}&quot;)
                          </span>
                        )}
                        {matchKind === 'none' && <span className="text-dim">–</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteGuest(guest.id)}
                          className="text-xs text-dim hover:text-red-500 transition"
                        >
                          {t('dash.remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Unzuordbare Antworten */}
        {unmatched.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs tracking-widest text-dim uppercase mb-4">
              {t('dash.unmatchedHeadline')}
            </h2>
            <p className="text-xs text-dim mb-4">
              {t('dash.unmatchedHint')}
            </p>
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {unmatched.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-medium text-accent">{r.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                          {statusLabel(r.status)}
                          {r.guest_count > 1 && ` (+${r.guest_count - 1})`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <button
                            onClick={async () => {
                              await supabase.from('guests').insert({ full_name: r.name });
                              await reload();
                            }}
                            className="text-xs text-dim hover:text-accent transition"
                          >
                            {t('dash.addToGuestList')}
                          </button>
                          <button
                            onClick={() => handleDeleteResponse(r.name)}
                            className="text-xs text-dim hover:text-red-500 transition"
                          >
                            {t('dash.deleteResponse')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Alle Antworten (bestehende Tabelle) */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs tracking-widest text-dim uppercase">{t('dash.allResponses')}</h2>
            <button
              onClick={handleExportCSV}
              className="text-xs text-dim hover:text-accent transition"
            >
              {t('dash.csvExport')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(['all', 'yes', 'maybe', 'no'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs transition ${
                  filter === f
                    ? 'bg-accent text-base'
                    : 'border border-line text-dim hover:border-line-hover hover:text-accent'
                }`}
              >
                {t(`dash.filter.${f}` as const)}
                {f !== 'all' && summary && (
                  <span className="ml-1.5 opacity-60">
                    {f === 'yes' ? summary.yes_responses : f === 'no' ? summary.no_responses : summary.maybe_responses}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.name')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.status')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.pers')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.bringing')}</th>
                    <th className="text-left px-5 py-3 text-xs tracking-widest text-dim uppercase font-normal">{t('dash.col.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-dim text-sm">
                        {t('dash.noEntries')}
                      </td>
                    </tr>
                  ) : (
                    filteredResponses.map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-3 font-medium text-accent">{r.name}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-dim text-center">{r.guest_count}</td>
                        <td className="px-5 py-3 text-dim">{r.bringing || ''}</td>
                        <td className="px-5 py-3 text-dim whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-xs text-dim">
            {filteredResponses.length} {filteredResponses.length === 1 ? t('dash.entry') : t('dash.entries')}
          </p>
        </section>

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: number | string; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-xs tracking-widest text-dim uppercase mb-2">{label}</p>
      <p className={`text-2xl font-light ${highlight ? 'text-accent' : 'text-accent'}`}>{value}</p>
      {sub && <p className="text-xs text-dim mt-1">{sub}</p>}
    </div>
  );
}
