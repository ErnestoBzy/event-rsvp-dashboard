-- Phase 2: Core table for RSVP responses
-- Run this in Supabase SQL Editor.

create table if not exists public.rsvp_responses (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  status text not null check (status in ('yes', 'no', 'maybe')),
  guest_count integer not null default 1 check (guest_count >= 1 and guest_count <= 20),
  bringing text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rsvp_responses_created_at
  on public.rsvp_responses (created_at desc);

comment on table public.rsvp_responses is 'Guest RSVP submissions for the event.';
