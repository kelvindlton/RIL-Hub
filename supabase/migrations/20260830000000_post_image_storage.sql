-- ────────────────────────────────────────────────────────────────────────────
-- 20260830000000_post_image_storage.sql
--
-- Feed post images — STORAGE ONLY. Creates the `post-images` bucket and the
-- storage.objects policies behind it. No change to public.posts: image_url is
-- already TEXT with no CHECK, and it now holds a public storage URL for new
-- posts instead of a base64 data: URL.
--
-- Ownership model: identical to avatars (20260829000000). Storage has NO
-- foreign key to posts or profiles, so the path convention
--     <auth.uid()>/<uuid>.webp
-- IS the ownership claim, enforced on the FIRST path segment.
--
-- Why a UUID and not the post id: the object must exist BEFORE the row, because
-- image_url is an argument to the INSERT. A client-generated UUID avoids a
-- two-phase insert-then-update. The cost is that no policy can express "you
-- author the post this image belongs to" — only "this folder is yours".
--
-- public = true: post images render through a plain <img src> with no signing
-- step (src/app/page.tsx). NOTE this is a deliberate privilege change:
-- public.posts is SELECT-able only TO authenticated, so a post image was
-- previously behind RLS along with its row. It is now readable by anyone
-- holding the URL. Accepted knowingly — a private bucket would mean image_url
-- could not hold a durable URL at all (signed URLs expire, so every feed load
-- would have to mint them), and the paths are unguessable UUIDs.
--
-- 5 MiB rather than the avatars bucket's 2 MiB: a 1280px WebP photo lands
-- around 120-350KB, so this is a backstop with wide headroom, not a boundary
-- legitimate uploads are expected to approach.
--
-- allowed_mime_types EXCLUDES image/svg+xml, for the same reason as avatars: an
-- SVG is a scriptable document, and served same-origin from a public bucket it
-- reintroduces exactly the stored-XSS shape the *_url CHECKs closed in
-- 20260828000000.
--
-- Idempotent: `on conflict do update` for the bucket, `drop policy if exists`
-- before each create. RLS is NOT enabled here — Supabase ships storage.objects
-- with RLS already on, and `alter table storage.objects` fails for non-owners.
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,                                        -- 5 MiB, server-side backstop
  array['image/png', 'image/jpeg', 'image/webp']  -- no SVG
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 1. Read: public ──────────────────────────────────────────────────────────
-- Public-URL reads of a public bucket bypass RLS entirely, so this policy is for
-- the API paths that DON'T — e.g. storage.list(). It grants reads, not listing
-- of a folder by name, which still requires knowing the uid.
drop policy if exists "Post images are publicly readable" on storage.objects;
create policy "Post images are publicly readable" on storage.objects
  for select to public
  using (bucket_id = 'post-images');

-- ── 2-4. Writes: own folder only ─────────────────────────────────────────────
-- bucket_id is checked in EVERY policy: policies on storage.objects apply to all
-- buckets, so without it these would grant writes to every bucket added later.
drop policy if exists "Users can upload their own post images" on storage.objects;
create policy "Users can upload their own post images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Not used: uploadPostImage() does NOT pass upsert, because every attachment
-- gets a fresh UUID path and there is never an existing object to replace.
-- Created so the ownership rule is complete rather than half-defined, the same
-- call the avatars migration made for its unused DELETE policy.
drop policy if exists "Users can replace their own post images" on storage.objects;
create policy "Users can replace their own post images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleting a post now deletes its image object (see src/data/posts.ts
-- deletePost). The admin branch is required, not decorative: public.posts allows
-- `auth.uid() = author_id OR public.is_admin()` to delete, so without it an
-- admin deleting someone else's post would orphan that post's image forever.
-- public.is_admin() is SECURITY DEFINER (20260819000000_init_schema.sql:264) and
-- already called from the posts policies, so it is callable here too.
drop policy if exists "Users or admins can delete post images" on storage.objects;
create policy "Users or admins can delete post images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
