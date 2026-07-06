export type Guest = {
  id: number;
  full_name: string;
  notes: string | null;
  children_count: number;
};

export type Rsvp = {
  id: number;
  name: string;
  status: 'yes' | 'no' | 'maybe';
  guest_count: number;
  bringing: string | null;
  notes: string | null;
  created_at: string;
};

export type MatchKind = 'exact' | 'fuzzy' | 'none';

export type MatchResult = {
  kind: MatchKind;
  guest: Guest | null;
  reason?: string;
};

/**
 * Keep only the most recent RSVP per normalized name.
 * Assumes input is sorted by created_at descending.
 */
export function dedupeByName(rsvps: Rsvp[]): Rsvp[] {
  const seen = new Map<string, Rsvp>();
  for (const r of rsvps) {
    const key = normalize(r.name);
    if (key && !seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchRsvpToGuest(rsvpName: string, guests: Guest[]): MatchResult {
  const n = normalize(rsvpName);
  if (!n) return { kind: 'none', guest: null };

  // Exact match on full normalized name
  const exact = guests.find((g) => normalize(g.full_name) === n);
  if (exact) return { kind: 'exact', guest: exact };

  const rsvpParts = n.split(' ').filter(Boolean);

  // Both first AND last name match
  if (rsvpParts.length >= 2) {
    const first = rsvpParts[0];
    const last = rsvpParts[rsvpParts.length - 1];
    const match = guests.find((g) => {
      const gp = normalize(g.full_name).split(' ').filter(Boolean);
      if (gp.length < 2) return false;
      return gp[0] === first && gp[gp.length - 1] === last;
    });
    if (match) return { kind: 'fuzzy', guest: match, reason: 'Vor- und Nachname' };
  }

  // Last name unique
  if (rsvpParts.length >= 1) {
    const last = rsvpParts[rsvpParts.length - 1];
    const byLast = guests.filter((g) => {
      const gp = normalize(g.full_name).split(' ').filter(Boolean);
      return gp[gp.length - 1] === last;
    });
    if (byLast.length === 1) return { kind: 'fuzzy', guest: byLast[0], reason: 'Nachname' };
  }

  // First name unique
  if (rsvpParts.length >= 1) {
    const first = rsvpParts[0];
    const byFirst = guests.filter((g) => {
      const gp = normalize(g.full_name).split(' ').filter(Boolean);
      return gp[0] === first;
    });
    if (byFirst.length === 1) return { kind: 'fuzzy', guest: byFirst[0], reason: 'Vorname' };
  }

  return { kind: 'none', guest: null };
}

export type GuestWithStatus = {
  guest: Guest;
  rsvp: Rsvp | null;
  matchKind: MatchKind;
  matchReason?: string;
};

export function buildGuestStatus(guests: Guest[], rsvps: Rsvp[]): {
  guestStatuses: GuestWithStatus[];
  unmatched: Rsvp[];
} {
  // For each rsvp, find best matching guest
  const rsvpMatches = rsvps.map((r) => ({ rsvp: r, match: matchRsvpToGuest(r.name, guests) }));

  // Group matched rsvps by guest.id
  const byGuestId = new Map<number, { rsvp: Rsvp; kind: MatchKind; reason?: string }[]>();
  for (const { rsvp, match } of rsvpMatches) {
    if (match.guest) {
      const arr = byGuestId.get(match.guest.id) || [];
      arr.push({ rsvp, kind: match.kind, reason: match.reason });
      byGuestId.set(match.guest.id, arr);
    }
  }

  const guestStatuses: GuestWithStatus[] = guests.map((g) => {
    const matches = byGuestId.get(g.id);
    if (!matches || matches.length === 0) {
      return { guest: g, rsvp: null, matchKind: 'none' };
    }
    // Prefer exact match over fuzzy
    const best = matches.find((m) => m.kind === 'exact') || matches[0];
    return { guest: g, rsvp: best.rsvp, matchKind: best.kind, matchReason: best.reason };
  });

  const matchedRsvpIds = new Set(
    rsvpMatches.filter((r) => r.match.guest !== null).map((r) => r.rsvp.id)
  );
  const unmatched = rsvps.filter((r) => !matchedRsvpIds.has(r.id));

  return { guestStatuses, unmatched };
}
