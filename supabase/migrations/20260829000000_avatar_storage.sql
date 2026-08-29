-- ────────────────────────────────────────────────────────────────────────────
-- 20260829000000_avatar_storage.sql
--
-- Avatar upload — STORAGE ONLY. Creates the `avatars` bucket and the four
-- storage.objects policies that let a member manage exactly one folder: their
-- own, named after their auth uid.
--
-- Ownership model: Supabase Storage has NO foreign key to profiles. The only
-- link between an object and a member is the path convention
--     <auth.uid()>/avatar.webp
-- so every write policy checks the FIRST path segment against auth.uid().
-- storage.foldername(name) returns text[]; [1] is that first segment, and the
-- ::text cast is required to compare it against a uuid.
--
-- public = true: avatars render through a plain <img src> with no signing step
-- anywhere in the app. A private bucket would need a signed, expiring URL at
-- every render site. Trade-off accepted: any avatar URL is world-readable.
--
-- allowed_mime_types deliberately EXCLUDES image/svg+xml. An SVG is a scriptable
-- document; served same-origin from a public bucket it reintroduces exactly the
-- stored-XSS shape the *_url CHECKs closed in 20260828000000.
--
-- Idempotent: `on conflict do update` for the bucket, and `drop policy if
-- exists` before each create (Postgres has no `create policy if not exists`).
-- RLS is NOT enabled here: Supabase ships storage.objects with RLS already on,
-- and `alter table storage.objects` fails for non-owners.
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,                                        -- 2 MiB, server-side backstop
  array['image/png', 'image/jpeg', 'image/webp']  -- no SVG
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 1. Read: public ──────────────────────────────────────────────────────────
-- Public-URL reads of a public bucket bypass RLS entirely, so this policy is for
-- the API paths that DON'T — e.g. storage.list(). Harmless, and the piece you'd
-- need the moment anything lists a member's objects.
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- ── 2-4. Writes: own folder only ─────────────────────────────────────────────
-- bucket_id is checked in EVERY policy: policies on storage.objects apply to all
-- buckets, so without it these would grant writes to every bucket added later.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Required for upsert:true — replacing an existing object at the same path is an
-- UPDATE, not an INSERT. Without this policy the SECOND upload fails with 403.
drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Not used by v1's UI (there is no "Remove photo" button yet). Created so the
-- ownership rule is complete rather than half-defined.
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
