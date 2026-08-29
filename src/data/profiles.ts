import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/lib/mockDb';

// Shape of a public.profiles row as the Supabase client returns it. Declared
// explicitly rather than inferred: createClient() is called without a Database
// generic and this project has no generated types, so rows arrive untyped.
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserProfile['role'];
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  program_cohort: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  skills: string[] | null;
  interests: string[] | null;
  points: number | null;
  streak: number | null;
  badges: string[] | null;
  joined_date: string | null;
  birthday: string | null;
}

// Row → UserProfile, shared by every read path so a new column is wired up in
// exactly one place. Absent/empty text collapses to undefined so callers can use a
// plain falsy check (matches how `birthday` was already handled).
export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar_url || '/avatars/default.png',
    phone: row.phone || '',
    department: row.department || 'General',
    programCohort: row.program_cohort || 'Community',
    headline: row.headline || undefined,
    bio: row.bio || undefined,
    linkedinUrl: row.linkedin_url || undefined,
    githubUrl: row.github_url || undefined,
    websiteUrl: row.website_url || undefined,
    skills: row.skills || [],
    interests: row.interests || [],
    points: row.points || 0,
    streak: row.streak || 0,
    badges: row.badges || [],
    joinedDate: row.joined_date || '2026',
    birthday: row.birthday || undefined,
  };
}

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

  return data.map(mapProfileRow);
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

  return mapProfileRow(data);
}

// A cleared form field arrives as '', which must be stored as NULL. Storing ''
// would VIOLATE the *_url CHECKs from 20260828000000_profile_bio_and_socials.sql
// (they allow NULL or an http(s) value — '' is neither), so clearing a link would
// fail with a raw constraint error.
function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function updateProfile(
  id: string,
  updates: Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>
): Promise<UserProfile> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {
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
  if (updates.headline !== undefined) dbUpdates.headline = nullIfBlank(updates.headline);
  if (updates.bio !== undefined) dbUpdates.bio = nullIfBlank(updates.bio);
  if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = nullIfBlank(updates.linkedinUrl);
  if (updates.githubUrl !== undefined) dbUpdates.github_url = nullIfBlank(updates.githubUrl);
  if (updates.websiteUrl !== undefined) dbUpdates.website_url = nullIfBlank(updates.websiteUrl);

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data);
}
