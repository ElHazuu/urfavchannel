-- Cinta Kita / shared Our Story photos (run once in Supabase SQL Editor)
create extension if not exists pgcrypto;
create table if not exists public.site_story_photos (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(trim(title)) between 1 and 100),
 note text not null default '' check (char_length(note)<=700),
 photo_path text not null unique,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.site_story_photos enable row level security;
revoke all on public.site_story_photos from anon;
grant select,insert,delete on public.site_story_photos to authenticated;
drop policy if exists "Story members read photos" on public.site_story_photos;
create policy "Story members read photos" on public.site_story_photos for select to authenticated using (auth.uid() is not null);
drop policy if exists "Story members upload photos" on public.site_story_photos;
create policy "Story members upload photos" on public.site_story_photos for insert to authenticated with check (auth.uid()=created_by);
drop policy if exists "Story creators delete their photos" on public.site_story_photos;
create policy "Story creators delete their photos" on public.site_story_photos for delete to authenticated using (auth.uid()=created_by);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-story-photos','site-story-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Story members see photo files" on storage.objects;
create policy "Story members see photo files" on storage.objects for select to authenticated
using (bucket_id='site-story-photos');
drop policy if exists "Story members upload their photo files" on storage.objects;
create policy "Story members upload their photo files" on storage.objects for insert to authenticated
with check (bucket_id='site-story-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Story members remove own photo files" on storage.objects;
create policy "Story members remove own photo files" on storage.objects for delete to authenticated
using (bucket_id='site-story-photos' and (storage.foldername(name))[1]=auth.uid()::text);
