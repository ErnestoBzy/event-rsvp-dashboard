# Event RSVP & Photo Gallery

A small, password-protected event site: guests RSVP, upload photos, and
admins see who's coming.

Built as a fully static Next.js app — no backend server to maintain.
All state lives in Supabase.

## Tech

- **Next.js 16** (static export, App Router)
- **Tailwind CSS** for styling
- **Supabase** for auth, database, and private file storage
- **i18n** with `DE / EN` toggle (browser-stored preference)

## Architecture

There is **no backend server and no API route**. The app is exported as static
HTML/JS and served from any static host; the browser talks directly to Supabase.
All access control lives in Supabase (Auth + row-level security), so the static
bundle contains nothing sensitive — only the public URL and the anon key.

```
                        Static host (FTP / S3 / Netlify …)
                        serves the exported /out bundle
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
        GUEST JOURNEY                                   ADMIN JOURNEY
              │                                               │
   /  (invitation + shared password)             /admin  (admin password)
              │                                               │
   signInWithPassword(guest@…)                signInWithPassword(admin@…)
              │                                               │
      ┌───────┴────────┐                                      ▼
      ▼                ▼                             /admin/dashboard
 /guest/rsvp    /guest/photos                 · stats (coming / maybe / declined,
 RSVP form      upload + gallery                people, children)
      │                │                      · guest list CRUD + fuzzy matching
      │                │                        of RSVPs to invitees (lib/matching)
      ▼                ▼                      · buffet list, CSV export
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
│                                                                     │
│  Auth: two shared users — guest@… (guests), admin@… (admin)         │
│                                                                     │
│  Postgres (RLS enforced per JWT email):                             │
│   · rsvp_responses   guest: INSERT · admin: SELECT/DELETE           │
│   · guests           admin only (invitee list, managed in app)      │
│   · photos           guest + admin: INSERT/SELECT                   │
│   · rsvp_admin_summary  view, admin only (security_invoker)         │
│                                                                     │
│  Storage: private "photos" bucket — signed URLs only, no anon reads │
└─────────────────────────────────────────────────────────────────────┘
```

**Auth model:** the shared password is not checked in app code. Each password
belongs to one pre-created Supabase Auth user (`guest@…` / `admin@…`);
`signInWithPassword` decides, and every RLS policy keys off the JWT's email.
Wrong password → no session → no data access. The anon role can read nothing.

**Data flow, in short:** a guest signs in with the shared password, submits an
RSVP (insert) and optionally uploads photos (private bucket + `photos` row).
The admin signs in with a separate password and reads everything: responses are
de-duplicated per name, fuzzy-matched against the invitee list
(`lib/matching.ts`), and summarized into stats, a buffet list, and a CSV export.

**Event content** (title, date, venue) is injected at build time from
`NEXT_PUBLIC_EVENT_*` env vars — the source contains no event-specific data.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

### Environment variables

`.env.local` is **gitignored**. Required values:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # local scripts only, never shipped
NEXT_PUBLIC_EVENT_TITLE=...
```

> ⚠️ Never commit `.env.local` or any service role key.
> The anon key is safe to ship; the service role key is not.

### Supabase setup

1. Create a new Supabase project.
2. Run the SQL files in `supabase/` in order (`001_…` → `010_…`).
3. Create two Auth users in the Supabase dashboard (Auto-Confirm on):
   - `guest@example.com` — the shared guest password
   - `admin@example.com` — the admin password
4. Verify with `node scripts/smoke-test.mjs` (reads from `.env.local`).

Row-level security policies in `007_static_auth.sql` enforce who can
read what — the anon role has no access to anything sensitive, and the
photo bucket is private (signed URLs only).

## Deploy

```bash
npm run build         # produces /out
```

Upload the contents of `out/` to any static host (FTP, S3, Netlify, etc.).
Subdomain pointing to the static folder is all you need.

## Project structure

```
app/             Pages (home, /guest/rsvp, /guest/photos, /admin/*)
lib/             Supabase client, i18n, name-matching helpers
supabase/        SQL migrations (run in numeric order)
scripts/         Local-only utilities (smoke-test, etc.)
```

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 ErnestoBzy.
