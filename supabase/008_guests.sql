-- Invited guests list (admin-managed)
-- Run AFTER 007_static_auth.sql.

create table if not exists public.guests (
  id bigint generated always as identity primary key,
  full_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_guests_full_name on public.guests (full_name);

alter table public.guests enable row level security;

grant insert, select, update, delete on public.guests to authenticated;
grant usage on sequence public.guests_id_seq to authenticated;

drop policy if exists "admin can manage guests" on public.guests;
create policy "admin can manage guests"
  on public.guests
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');

comment on table public.guests is 'Invited guests list, admin-managed. Matched fuzzily against rsvp_responses.name';
