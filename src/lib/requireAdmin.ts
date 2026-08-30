import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

const ADMIN_ROLES = ['super_admin', 'admin'];

/**
 * Next signals redirects, dynamic-rendering bailouts and not-found by *throwing*
 * tagged errors that carry a string `digest` (NEXT_REDIRECT, DYNAMIC_SERVER_USAGE,
 * …). Those are control flow, not failures, and must propagate untouched. Ordinary
 * network/Postgres errors have no `digest`, so this cleanly separates the two.
 */
function isFrameworkSignal(err: unknown): boolean {
  return typeof (err as { digest?: unknown } | null)?.digest === 'string';
}

/**
 * Server-side gate for routes not yet released to non-admins.
 *
 * Reads `role` straight from public.profiles for the cookie session's user, so it
 * cannot be spoofed from the browser. Non-admins are sent to the feed with
 * ?notice=coming-soon, which DashboardLayout renders as a dismissible banner.
 *
 * Matches public.is_admin() — super_admin + admin only, staff excluded.
 */
export async function requireAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Mirrors the bail-out in utils/supabase/middleware.ts:19 — with no real
  // credentials there is no session to read a role from, and middleware already
  // skips auth entirely in that mode, so the gate stands down instead of locking
  // all four routes for everyone.
  if (!url || !key || url.includes('placeholder')) return;

  let isAdmin = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      isAdmin = Boolean(profile && ADMIN_ROLES.includes(profile.role));
    }
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    // Fail closed — a lookup failure must not grant access.
    console.error('[requireAdmin] role lookup failed:', err);
  }

  // redirect() throws NEXT_REDIRECT, so it sits outside the try block
  // (next docs, 04-functions/redirect.md:50-52).
  if (!isAdmin) redirect('/?notice=coming-soon');
}
