-- Refactor for static client-only hosting:
-- All access goes through Supabase Auth. Two users expected:
--   guest@example.com
--   admin@example.com
--
-- Run AFTER 006_photos.sql.

-- =========================================================
-- rsvp_responses: guests can INSERT, admin can SELECT
-- =========================================================

grant insert on public.rsvp_responses to authenticated;
grant select on public.rsvp_responses to authenticated;
grant usage on sequence public.rsvp_responses_id_seq to authenticated;

drop policy if exists "guests can submit rsvp" on public.rsvp_responses;
create policy "guests can submit rsvp"
  on public.rsvp_responses
  for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') in ('guest@example.com', 'admin@example.com')
  );

drop policy if exists "admin can read rsvp" on public.rsvp_responses;
create policy "admin can read rsvp"
  on public.rsvp_responses
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email') = 'admin@example.com'
  );

-- =========================================================
-- rsvp_admin_summary view: admin-only via security_invoker
-- =========================================================

alter view public.rsvp_admin_summary set (security_invoker = on);
grant select on public.rsvp_admin_summary to authenticated;

-- =========================================================
-- photos table: guests can INSERT + SELECT, admin same
-- =========================================================

grant insert on public.photos to authenticated;
grant select on public.photos to authenticated;
revoke all on public.photos from anon;

drop policy if exists "Anyone can view photos" on public.photos;
drop policy if exists "authed can view photos" on public.photos;
create policy "authed can view photos"
  on public.photos
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email') in ('guest@example.com', 'admin@example.com')
  );

drop policy if exists "authed can insert photos" on public.photos;
create policy "authed can insert photos"
  on public.photos
  for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') in ('guest@example.com', 'admin@example.com')
  );

-- =========================================================
-- Storage bucket "photos": make private, auth-only access
-- =========================================================

update storage.buckets
  set public = false
  where id = 'photos';

drop policy if exists "Anyone can view photo files" on storage.objects;
drop policy if exists "authed can view photo files" on storage.objects;
create policy "authed can view photo files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (auth.jwt() ->> 'email') in ('guest@example.com', 'admin@example.com')
  );

drop policy if exists "authed can upload photo files" on storage.objects;
create policy "authed can upload photo files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (auth.jwt() ->> 'email') in ('guest@example.com', 'admin@example.com')
  );
