import { createClient } from '@/utils/supabase/client';
import { UserProfile } from './mockDb';

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
  } | null;
  expires?: string;
}

export const auth = {
  /**
   * Retrieves active session details from Supabase.
   */
  async getSession(): Promise<AuthSession | null> {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session || !session.user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      user: {
        id: session.user.id,
        name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        role: profile?.role || 'member',
        avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url || '/avatars/default.png',
      },
      expires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined,
    };
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, password: string) {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  /**
   * Sign up with Email, Password and Full Name
   */
  async signUpWithEmail(email: string, password: string, fullName: string) {
    const supabase = createClient();
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          avatar_url: '/avatars/default.png',
        },
      },
    });
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const supabase = createClient();
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
  },

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(email: string) {
    const supabase = createClient();
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
    });
  },

  /**
   * Invalidates active session.
   */
  async signOut() {
    const supabase = createClient();
    return await supabase.auth.signOut();
  },
};
