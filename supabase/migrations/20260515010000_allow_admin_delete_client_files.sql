drop policy if exists "Admins can delete client files" on storage.objects;
create policy "Admins can delete client files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-downloads'
  and private.is_admin()
);
