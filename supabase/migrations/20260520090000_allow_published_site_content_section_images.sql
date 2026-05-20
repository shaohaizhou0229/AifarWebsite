drop policy if exists "Published site content images are public" on storage.objects;
create policy "Published site content images are public"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'site-content-images'
  and exists (
    select 1
    from public.site_page_contents spc
    where spc.is_published
      and (
        spc.hero_image_path = name
        or spc.published_content::text like '%' || to_jsonb(name::text)::text || '%'
      )
  )
);
