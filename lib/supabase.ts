import { createClient } from '@supabase/supabase-js';

export const GUEST_EMAIL = 'guest@example.com';
export const ADMIN_EMAIL = 'admin@example.com';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'event-rsvp-auth',
    },
  }
);

export async function getCurrentRole(): Promise<'guest' | 'admin' | null> {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (email === ADMIN_EMAIL) return 'admin';
  if (email === GUEST_EMAIL) return 'guest';
  return null;
}
