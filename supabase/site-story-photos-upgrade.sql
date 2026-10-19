-- Run once in Supabase SQL Editor. Upgrade existing story photos; keeps all photos.
alter table public.site_story_photos add column if not exists animation text not null default 'gentle';
alter table public.site_story_photos drop constraint if exists site_story_photos_animation_check;
alter table public.site_story_photos add constraint site_story_photos_animation_check check (animation in ('none','gentle','float','kenburns','glow','tilt','polaroid','pulse','reveal','shimmer'));
grant update on public.site_story_photos to authenticated;
drop policy if exists "Story creators can edit photos" on public.site_story_photos;
create policy "Story creators can edit photos" on public.site_story_photos for update to authenticated
using (auth.uid()=created_by) with check (auth.uid()=created_by);
drop policy if exists "Story creators can replace photo files" on storage.objects;
create policy "Story creators can replace photo files" on storage.objects for update to authenticated
using (bucket_id='site-story-photos' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='site-story-photos' and (storage.foldername(name))[1]=auth.uid()::text);
