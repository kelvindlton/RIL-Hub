'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, ArrowRight, AlertCircle, Loader2, KeyRound } from 'lucide-react';

// Supabase's own floor is 6; 8 is ours. The server stays the enforcement point —
// this only spares the member a round trip.
const PASSWORD_MIN = 8;

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800';

export default function ResetPasswordPage() {
  const router = useRouter();

  // /auth/* is exempt from the middleware auth guard (utils/supabase/middleware.ts),
  // so this page is reachable with no session at all — a stale link, or someone
  // typing the URL. 'checking' avoids flashing the form before we know.
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { session } } = await createClient().auth.getSession();
      if (!cancelled) setSessionState(session ? 'ready' : 'missing');
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < PASSWORD_MIN) {
      setErrorMsg(`Your password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Those two passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      // The recovery exchange already signed them in, so there is nothing to log
      // into — go straight to the feed. refresh() re-reads the session server-side.
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Your password could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-lg bg-brand-blue flex items-center justify-center font-bold text-white text-xl mx-auto shadow-md">
          R
        </div>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-brand-black">
          Choose a new password
        </h2>
        <p className="mt-1.5 text-center text-xs text-gray-500 font-medium">
          You&apos;ll be signed in as soon as it&apos;s saved.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-200 shadow-md sm:rounded-lg sm:px-10 space-y-6">

          {sessionState === 'checking' && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs font-bold text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying your reset link…
            </div>
          )}
          {sessionState === 'missing' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-semibold text-red-600 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This reset link is no longer valid. Links expire, work only once, and
                  must be opened on the same device you requested them from.
                </span>
              </div>
              <Link
                href="/login"
                className="w-full bg-brand-blue text-white text-xs font-bold py-2.5 rounded-lg hover:bg-brand-blue/95 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                Request a new link
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {sessionState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-semibold text-red-600 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Confirm New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold">
                <input
                  id="show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue cursor-pointer"
                />
                <label htmlFor="show-password" className="ml-2 block text-gray-500 cursor-pointer select-none">
                  Show password
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue text-white text-xs font-bold py-2.5 rounded-lg hover:bg-brand-blue/95 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    Save New Password
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
