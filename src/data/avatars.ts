import { createClient } from '@/utils/supabase/client';

const BUCKET = 'avatars';

// ONE object per member, forever. The path is fixed rather than derived from the
// source file's extension because downscaleImage() re-encodes everything to WebP
// (an input extension would no longer describe the stored bytes) and because
// upsert only replaces at an IDENTICAL path — per-format names would orphan the
// old object the first time somebody switched from PNG to JPEG.
//
// The FIRST path segment must be the member's auth uid: that is the entire
// ownership model, enforced by the storage.objects policies in
// 20260829000000_avatar_storage.sql via (storage.foldername(name))[1].
const objectPath = (userId: string) => `${userId}/avatar.webp`;

/**
 * Uploads `image` as the member's avatar and returns the public URL to store in
 * profiles.avatar_url. Does NOT touch the profiles row — the caller writes that
 * only after this resolves, so avatar_url can never name a file that is missing
 * from storage.
 */
export async function uploadAvatar(userId: string, image: Blob): Promise<string> {
  const supabase = createClient();
  const path = objectPath(userId);

  // upsert:true is what makes re-uploading work, and it is why the bucket needs
  // an UPDATE policy as well as INSERT. contentType must be passed explicitly: a
  // Blob (unlike a File) carries no filename for supabase-js to infer from, and
  // the value is what the bucket's allowed_mime_types is checked against.
  const { error } = await supabase.storage.from(BUCKET).upload(path, image, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // A fixed path means the URL never changes, so the browser and CDN would keep
  // serving the PREVIOUS image after a replace — the member would see their old
  // photo after a successful upload. ?v= makes every save a distinct URL.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Deletes the member's stored avatar object. Uses the DELETE policy from
 * 20260829000000_avatar_storage.sql, which scopes the delete to the caller's own
 * uid-named folder — the same (storage.foldername(name))[1] = auth.uid()::text
 * predicate that guards the upload.
 *
 * Does NOT touch profiles.avatar_url. The caller resets the row FIRST and calls
 * this second — the inverse of the upload order — so a failure here leaves an
 * unreferenced orphan (harmless; the next upload upserts over the same fixed
 * path) instead of a row pointing at a file that no longer exists.
 *
 * remove() on a key that isn't there resolves without an error, which makes this
 * idempotent and safe to retry. That is the documented API contract rather than
 * something exercised here against a missing object.
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(BUCKET).remove([objectPath(userId)]);

  if (error) {
    throw new Error(error.message);
  }
}
