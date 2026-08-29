// Avatar identity helpers, kept out of Avatar.tsx so AvatarViewerModal can reuse
// them without importing the component that renders it (Avatar -> viewer -> Avatar
// would be a circular import).

// The seeded placeholder. Treated as "no photo" everywhere rather than fetched:
// it is also what removeOwnAvatar() writes back to profiles.avatar_url.
export const DEFAULT_AVATAR = '/avatars/default.png';

export function isPlaceholderAvatar(src?: string | null): boolean {
  return !src || src === DEFAULT_AVATAR || src.trim() === '';
}

// Deterministic palette: the same name always yields the same colour, so a member
// without a photo still looks like the same person across the app.
const BG_COLORS = [
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-purple-600 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-600 text-white',
  'bg-teal-600 text-white',
];

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getColorForName(name?: string): string {
  if (!name) return BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BG_COLORS.length;
  return BG_COLORS[index];
}
