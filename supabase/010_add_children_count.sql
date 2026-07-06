-- Admin-managed: how many children are coming with this guest.
-- Edited after the fact in the dashboard. Safe to run on existing databases.

alter table public.guests
  add column if not exists children_count integer not null default 0
  check (children_count >= 0 and children_count <= 20);

comment on column public.guests.children_count is
  'Number of children attending with this guest. Admin-managed, edited in dashboard.';
