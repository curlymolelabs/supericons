-- Supericons: owned cache bucket for Material Symbols export snapshots
-- Private bucket; snapshots are served through the edge function.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'material-icons',
  'material-icons',
  false,
  1048576,
  array['image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
