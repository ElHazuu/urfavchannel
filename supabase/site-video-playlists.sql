-- Cinta Kita shared video playlists. Run once in Supabase SQL Editor.
-- Both signed-in site members can create and organize shared playlists.
create extension if not exists pgcrypto;
create table if not exists public.site_video_playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 70),
  video_ids text[] not null default '{}',
  sort_order integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.site_video_playlists enable row level security;
revoke all on public.site_video_playlists from anon;
grant select,insert,update,delete on public.site_video_playlists to authenticated;
drop policy if exists "Signed in members can view shared playlists" on public.site_video_playlists;
create policy "Signed in members can view shared playlists"
on public.site_video_playlists for select to authenticated using (auth.uid() is not null);
drop policy if exists "Signed in members can create shared playlists" on public.site_video_playlists;
create policy "Signed in members can create shared playlists"
on public.site_video_playlists for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Signed in members can edit shared playlists" on public.site_video_playlists;
create policy "Signed in members can edit shared playlists"
on public.site_video_playlists for update to authenticated using (auth.uid() is not null)
with check (auth.uid() is not null);
drop policy if exists "Signed in members can delete shared playlists" on public.site_video_playlists;
create policy "Signed in members can delete shared playlists"
on public.site_video_playlists for delete to authenticated using (auth.uid() is not null);
create index if not exists site_video_playlists_order_idx on public.site_video_playlists(sort_order,created_at);
