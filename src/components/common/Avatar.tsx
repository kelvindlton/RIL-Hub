'use client';

import React, { useState } from 'react';
import { getColorForName, getInitials, isPlaceholderAvatar } from '@/lib/avatar';
import AvatarViewerModal from '@/components/common/AvatarViewerModal';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  badgeColor?: string;
  loading?: boolean;
  /** Opt-in: clicking opens a read-only viewer. NOT safe inside a <button> or
   *  <Link> — several call sites are wrapped that way and are deliberately left
   *  alone (nested interactive elements, and the click would steal the parent's
   *  navigate affordance). */
  viewable?: boolean;
  /** Adds Change/Remove photo to the viewer. Only ever true where the call site
   *  knows this avatar belongs to the signed-in member. */
  editable?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

// getInitials / getColorForName / isPlaceholderAvatar live in @/lib/avatar so
// AvatarViewerModal can render enlarged initials without importing this file.

export default function Avatar({
  src,
  name = 'User',
  size = 'md',
  className = '',
  showBadge = false,
  badgeColor = 'bg-green-500',
  loading = false,
  viewable = false,
  editable = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);
  const colorClass = getColorForName(name);

  const isInvalidSrc = isPlaceholderAvatar(src);

  if (loading) {
    return (
      <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
        <div className={`${sizeClass} rounded-full bg-gray-200 animate-pulse`} aria-hidden="true" />
      </div>
    );
  }

  const visual =
    isInvalidSrc || hasError ? (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold tracking-wider ${colorClass} shadow-inner`}
        title={name}
      >
        {initials}
      </div>
    ) : (
      <img
        src={src ?? undefined}
        alt={name}
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-black/5 bg-gray-100`}
      />
    );

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {viewable ? (
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          aria-label={editable ? 'View or change your photo' : `View ${name}'s photo`}
          className="inline-flex rounded-full cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
        >
          {visual}
        </button>
      ) : (
        visual
      )}

      {showBadge && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white ${badgeColor}`}
        />
      )}

      {isViewerOpen && (
        <AvatarViewerModal
          src={src}
          name={name}
          editable={editable}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
}
