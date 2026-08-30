import { createClient } from '@/utils/supabase/client';

const BUCKET = 'post-images';

// ONE object per attachment, named with a fresh UUID rather than the post id:
// the row does not exist yet when this runs, because image_url is an argument to
// the INSERT. A client-generated name avoids a two-phase insert-then-update.
//
// The FIRST path segment must be the author's auth uid — that is the entire
// ownership model, enforced by the storage.objects policies in
// 20260830000000_post_image_storage.sql via (storage.foldername(name))[1].
const objectPath = (userId: string) => `${userId}/${crypto.randomUUID()}.webp`;

// The public-URL shape getPublicUrl() produces. Used to recognise our own
// objects on the way back out, in deletePostImage.
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;

/**
 * Uploads `image` as a feed attachment and returns the public URL to store in
 * posts.image_url. Does NOT create the post — the caller inserts the row only
 * after this resolves, so image_url can never name a file missing from storage.
 */
export async function uploadPostImage(userId: string, image: Blob): Promise<string> {
  const supabase = createClient();
  const path = objectPath(userId);

  // No upsert, unlike avatars: the path is unique per upload so there is nothing
  // to replace — which is also why there is no ?v= cache-bust here, and why the
  // object can be cached for a year. contentType must be passed explicitly: a
  // Blob (unlike a File) carries no filename for supabase-js to infer from, and
  // this value is what the bucket's allowed_mime_types is checked against.
  const { error } = await supabase.storage.from(BUCKET).upload(path, image, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Recovers the storage key from a stored image_url, or null when the value is
// not one of ours. That null branch is load-bearing rather than defensive:
// posts.image_url is permanently mixed-representation — legacy base64 `data:`
// values (no migration, by decision) and the seeded '/assets/...' mock path both
// land here and must be left completely alone.
function objectPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const index = url.indexOf(PUBLIC_URL_MARKER);
  if (index === -1) return null;
  const path = url.slice(index + PUBLIC_URL_MARKER.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Deletes the storage object an image_url points at. No-ops for any value that
 * isn't a post-images URL, so it is safe to call for every deleted post.
 *
 * Uses the DELETE policy from 20260830000000_post_image_storage.sql, which
 * permits the owning uid OR an admin — matching public.posts, where admins can
 * delete other members' posts.
 *
 * remove() on a key that isn't there resolves without an error, which makes this
 * idempotent. That is the documented API contract rather than something
 * exercised here against a missing object.
 */
export async function deletePostImage(url: string | null | undefined): Promise<void> {
  const path = objectPathFromUrl(url);
  if (!path) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
