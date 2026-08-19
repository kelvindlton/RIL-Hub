import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/lib/mockDb';

export async function fetchProfiles(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    avatar: p.avatar_url || '/avatars/default.png',
    phone: p.phone || '',
    department: p.department || 'General',
    programCohort: p.program_cohort || 'Community',
    skills: p.skills || [],
    interests: p.interests || [],
    points: p.points || 0,
    streak: p.streak || 0,
    badges: p.badges || [],
    joinedDate: p.joined_date || '2026',
    birthday: p.birthday || undefined,
  }));
}

export async function fetchProfileById(id: string): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    avatar: data.avatar_url || '/avatars/default.png',
    phone: data.phone || '',
    department: data.department || 'General',
    programCohort: data.program_cohort || 'Community',
    skills: data.skills || [],
    interests: data.interests || [],
    points: data.points || 0,
    streak: data.streak || 0,
    badges: data.badges || [],
    joinedDate: data.joined_date || '2026',
    birthday: data.birthday || undefined,
  };
}

export async function updateProfile(
  id: string,
  updates: Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>
) {
  const supabase = createClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.department !== undefined) dbUpdates.department = updates.department;
  if (updates.programCohort !== undefined) dbUpdates.program_cohort = updates.programCohort;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
  if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
  if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
  if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
