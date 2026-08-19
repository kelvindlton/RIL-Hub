'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Shield, Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(authError);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await auth.signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        const { data, error } = await auth.signUpWithEmail(email, password, fullName);
        if (error) {
          setErrorMsg(error.message);
        } else if (data?.session) {
          router.push('/');
          router.refresh();
        } else {
          setSuccessMsg('Account created! Please check your email inbox to verify your account.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await auth.signInWithGoogle();
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address above to receive a password reset link.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await auth.resetPasswordForEmail(email);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* Back button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-lg bg-brand-blue flex items-center justify-center font-bold text-white text-xl mx-auto shadow-md">
          R
        </div>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-brand-black">
          Renaissance Family Portal
        </h2>
        <p className="mt-1.5 text-center text-xs text-gray-500 font-medium">
          The unified digital home for Renaissance Innovation Labs.
        </p>

        {/* Tab switcher for Sign In vs Sign Up */}
        <div className="mt-6 flex bg-gray-200/80 p-1 rounded-xl max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'signin' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-200 shadow-md sm:rounded-lg sm:px-10 space-y-6">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-semibold text-red-600 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs font-semibold text-green-700 flex gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Full Name</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Email Address</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@renaissancelabs.org"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Password</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                />
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-500">
                    Keep session active
                  </label>
                </div>

                <div className="text-xs">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-bold text-brand-blue hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white text-xs font-bold py-2.5 rounded-lg hover:bg-brand-blue/95 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

          </form>

          {/* Social login divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400 font-semibold">Or continue with</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full bg-white border border-gray-200 text-xs font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-gray-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.984 0-.743-.08-1.3-.178-1.86H12.24z"/>
              </svg>
              Google Workspace
            </button>
          </div>

          {/* Security badge */}
          <div className="bg-sky-blue/5 border border-sky-blue/20 rounded-lg p-3 text-[10px] font-semibold text-sky-blue leading-relaxed flex gap-2">
            <Shield className="w-4 h-4 text-sky-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide leading-none">Enterprise SSO & RLS Active</p>
              <p className="mt-1 text-gray-500 leading-normal">
                Access is protected by Supabase Row Level Security and encrypted identity credentials.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans text-xs font-bold text-gray-500">Loading portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
