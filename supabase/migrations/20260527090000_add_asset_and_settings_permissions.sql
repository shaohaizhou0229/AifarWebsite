update public.profiles
set admin_permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(admin_permissions || array['admin.assets']) as permission
)
where role = 'admin'
  and admin_permissions @> array['admin.product']::text[]
  and not admin_permissions @> array['admin.assets']::text[];

update public.profiles
set admin_permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(admin_permissions || array['admin.settings']) as permission
)
where role = 'admin'
  and admin_permissions @> array['admin.users']::text[]
  and not admin_permissions @> array['admin.settings']::text[];

update public.user_invitations
set admin_permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(admin_permissions || array['admin.assets']) as permission
)
where role = 'admin'
  and admin_permissions @> array['admin.product']::text[]
  and not admin_permissions @> array['admin.assets']::text[];

update public.user_invitations
set admin_permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(admin_permissions || array['admin.settings']) as permission
)
where role = 'admin'
  and admin_permissions @> array['admin.users']::text[]
  and not admin_permissions @> array['admin.settings']::text[];
