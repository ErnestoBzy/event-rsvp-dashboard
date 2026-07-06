-- Make email optional (removed from guest form)
alter table public.rsvp_responses
  alter column email drop not null;
