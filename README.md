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
