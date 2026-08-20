import { createClient } from '@/utils/supabase/client';

export interface Spotlight {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment?: string;
  userRole?: string;
  category: string;
  badgeLabel: string;
  quote: string;
  tags: string[];
  theme: 'blue' | 'white';
  isFeatured: boolean;
  createdAt: string;
}

/**
 * NOTE ON SPOTLIGHTS ARCHITECTURE:
 * Currently implementing Option A (Admin/Staff Curated Honors) where leadership
 * handpicks members and writes custom achievement writeups.
 * Option B (automated rankings from points_ledger / daily check-in streaks) is a planned
 * future addition once the platform reaches critical activity volume.
 */
export async function fetchSpotlights(): Promise<Spotlight[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('spotlights')
    .select(`
      id,
      user_id,
      category,
      badge_label,
      quote,
      tags,
      theme,
      is_featured,
      created_at,
      profiles!spotlights_user_id_fkey (
        name,
        avatar,
        department,
        role
      )
    `)
    .eq('is_featured', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Could not fetch spotlights from Supabase:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.name || 'Member',
    userAvatar: row.profiles?.avatar || '',
    userDepartment: row.profiles?.department,
    userRole: row.profiles?.role,
    category: row.category,
    badgeLabel: row.badge_label,
    quote: row.quote,
    tags: row.tags || [],
    theme: (row.theme === 'white' ? 'white' : 'blue') as 'blue' | 'white',
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  }));
}

export async function createSpotlight(params: {
  userId: string;
  category: string;
  badgeLabel: string;
  quote: string;
  tags: string[];
  theme: 'blue' | 'white';
}): Promise<Spotlight> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('spotlights')
    .insert({
      user_id: params.userId,
      category: params.category,
      badge_label: params.badgeLabel,
      quote: params.quote,
      tags: params.tags,
      theme: params.theme,
      is_featured: true,
    })
    .select(`
      id,
      user_id,
      category,
      badge_label,
      quote,
      tags,
      theme,
      is_featured,
      created_at,
      profiles!spotlights_user_id_fkey (
        name,
        avatar,
        department,
        role
      )
    `)
    .single();

  if (error) throw new Error(error.message);

  const row = data as any;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.name || 'Member',
    userAvatar: row.profiles?.avatar || '',
    userDepartment: row.profiles?.department,
    userRole: row.profiles?.role,
    category: row.category,
    badgeLabel: row.badge_label,
    quote: row.quote,
    tags: row.tags || [],
    theme: (row.theme === 'white' ? 'white' : 'blue') as 'blue' | 'white',
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  };
}
