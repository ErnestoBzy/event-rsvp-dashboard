-- Phase 2: RLS + policy baseline
-- Run this after 001_rsvp_schema.sql.
-- This keeps table private by default.

alter table public.rsvp_responses enable row level security;

-- Deny all anonymous direct access by default.
revoke all on table public.rsvp_responses from anon;
revoke all on table public.rsvp_responses from authenticated;

-- Optional policy templates (disabled by default):
-- If you later choose direct client writes/reads (not recommended for this project),
-- create explicit policies for anon/authenticated roles.
--
-- create policy "anon_insert_rsvp"
--   on public.rsvp_responses
--   for insert
--   to anon
--   with check (true);
--
-- create policy "anon_select_rsvp"
--   on public.rsvp_responses
--   for select
--   to anon
--   using (true);

comment on table public.rsvp_responses is 'RLS enabled; access expected via secure server-side routes.';
