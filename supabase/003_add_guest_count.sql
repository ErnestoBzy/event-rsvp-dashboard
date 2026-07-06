-- Phase 2: Add explicit guest count for attendee overview
-- Safe to run on existing databases.

alter table public.rsvp_responses
  add column if not exists guest_count integer;

update public.rsvp_responses
set guest_count = 1
where guest_count is null;

alter table public.rsvp_responses
  alter column guest_count set default 1;

alter table public.rsvp_responses
  alter column guest_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rsvp_responses_guest_count_check'
  ) then
    alter table public.rsvp_responses
      add constraint rsvp_responses_guest_count_check
      check (guest_count >= 1 and guest_count <= 20);
  end if;
end $$;

comment on column public.rsvp_responses.guest_count is
  'Number of people included in this RSVP (attendee plus companions).';
