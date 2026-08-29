'use client';

import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  badgeColor?: string;
  loading?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

// Deterministic pastel/brand color palette based on name hash
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

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name?: string): string {
  if (!name) return BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BG_COLORS.length;
  return BG_COLORS[index];
}

export default function Avatar({
  src,
  name = 'User',
  size = 'md',
  className = '',
  showBadge = false,
  badgeColor = 'bg-green-500',
  loading = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);
  const colorClass = getColorForName(name);

  const isInvalidSrc = !src || src === '/avatars/default.png' || src.trim() === '';

  if (loading) {
    return (
      <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
        <div className={`${sizeClass} rounded-full bg-gray-200 animate-pulse`} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {isInvalidSrc || hasError ? (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-bold tracking-wider ${colorClass} shadow-inner`}
          title={name}
        >
          {initials}
        </div>
      ) : (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          className={`${sizeClass} rounded-full object-cover ring-1 ring-black/5 bg-gray-100`}
        />
      )}

      {showBadge && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white ${badgeColor}`}
        />
      )}
    </div>
  );
}
