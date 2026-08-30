'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PostImageViewerModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * View-only lightbox for feed attachments. Deliberately dumb: no useApp, no
 * upload or delete, no busy state — unlike AvatarViewerModal, which owns the
 * avatar mutations and therefore has to guard its own close button.
 *
 * Sizing is viewport-relative with object-contain rather than that viewer's
 * fixed 320px square. Post images are stored up to 1280px at whatever aspect
 * ratio the member uploaded, and the feed thumbnail already crops
 * (max-h-80 + object-cover) — showing the WHOLE frame is the entire point of
 * opening this. Legacy base64 `data:` values in posts.image_url render through
 * the same path; the component never inspects src.
 */
export function PostImageViewerModal({ src, alt = 'Post attachment', onClose }: PostImageViewerModalProps) {
  const [hasError, setHasError] = useState(false);

  // Currently the only Escape-to-close in the app — AvatarViewerModal closes on
  // backdrop/X only. Registering a listener is not the pattern
  // react-hooks/set-state-in-effect rejects: onClose runs from the event, not
  // synchronously in the effect body.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Post attachment"
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:-top-3 sm:-right-12 z-10 text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* The feed hides a broken thumbnail outright, so this only fires when
            the full-size load fails on its own — a blank void would read as a
            bug to someone who deliberately clicked to see the image. */}
        {hasError ? (
          <p className="text-sm font-bold text-white text-center max-w-xs px-8 py-12">
            This image could not be loaded.
          </p>
        ) : (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-xl ring-1 ring-white/20 bg-gray-900"
          />
        )}
      </div>
    </div>,
    document.body
  );
}
export default PostImageViewerModal;
