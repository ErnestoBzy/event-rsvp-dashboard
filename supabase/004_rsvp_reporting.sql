-- Phase 2: Reporting objects for attendee overview
-- Run this after 003_add_guest_count.sql.

create or replace view public.rsvp_admin_summary as
select
  count(*)::int as total_responses,
  count(*) filter (where status = 'yes')::int as yes_responses,
  count(*) filter (where status = 'maybe')::int as maybe_responses,
  count(*) filter (where status = 'no')::int as no_responses,
  coalesce(sum(guest_count) filter (where status = 'yes'), 0)::int as total_people_coming,
  coalesce(sum(guest_count) filter (where status = 'maybe'), 0)::int as total_people_maybe,
  coalesce(sum(guest_count) filter (where status = 'no'), 0)::int as total_people_declined,
  coalesce(sum(guest_count), 0)::int as total_people_all_statuses
from public.rsvp_responses;

comment on view public.rsvp_admin_summary is
  'Aggregated RSVP and people totals based on guest_count and status.';
