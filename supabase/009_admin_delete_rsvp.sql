-- Allow admin to delete RSVP responses (e.g. unmatched plus-ones, typos).
-- Run AFTER 007_static_auth.sql.

grant delete on public.rsvp_responses to authenticated;

drop policy if exists "admin can delete rsvp" on public.rsvp_responses;
create policy "admin can delete rsvp"
  on public.rsvp_responses
  for delete
  to authenticated
  using (
    (auth.jwt() ->> 'email') = 'admin@example.com'
  );
