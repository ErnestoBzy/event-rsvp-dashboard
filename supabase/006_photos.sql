-- Photos metadata table
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_size integer,
  mime_type text,
  uploader_name text,
  created_at timestamp with time zone default now()
);

create index if not exists photos_created_at_idx on photos (created_at desc);

-- Anyone can read photo metadata (public gallery)
alter table photos enable row level security;

drop policy if exists "Anyone can view photos" on photos;
create policy "Anyone can view photos"
  on photos for select
  using (true);

-- Storage bucket (public, 10MB max per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

-- Anyone can read uploaded photo files
drop policy if exists "Anyone can view photo files" on storage.objects;
create policy "Anyone can view photo files"
  on storage.objects for select
  using (bucket_id = 'photos');
