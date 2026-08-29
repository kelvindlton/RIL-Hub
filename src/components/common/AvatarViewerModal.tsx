'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ACCEPTED_IMAGE_TYPES, downscaleImage, validateImageFile } from '@/lib/image';
import { getColorForName, getInitials, isPlaceholderAvatar } from '@/lib/avatar';
import AvatarCropModal from '@/components/profile/AvatarCropModal';

// 320px. Stored avatars are capped at MAX_DIMENSION = 512 (see lib/image.ts), so
// this never upscales; a fixed box is honest about "full size" rather than
// stretching a modest source to fill the screen.
const VIEWER_SIZE = 'w-80 h-80 max-w-[80vw] max-h-[80vw]';

interface AvatarViewerModalProps {
  src?: string | null;
  name: string;
  /** True only where the call site knows this is the signed-in member. */
  editable?: boolean;
  onClose: () => void;
}

export function AvatarViewerModal({ src, name, editable = false, onClose }: AvatarViewerModalProps) {
  const { setOwnAvatar, removeOwnAvatar } = useApp();
  const [hasError, setHasError] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Same predicate Avatar uses, so what the viewer shows always matches what was
  // clicked: a member with no photo gets their initials, enlarged.
  const showInitials = isPlaceholderAvatar(src) || hasError;
  const hasStoredPhoto = !isPlaceholderAvatar(src);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared so the SAME file can be picked again after a rejection — otherwise
    // re-choosing it fires no change event.
    e.target.value = '';
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setConfirmRemove(false);
    setPendingFile(file);
  };

  const handleCropSave = async (cropped: Blob) => {
    setPendingFile(null);
    setError(null);
    setBusy('upload');
    try {
      // Crop output -> existing pipeline. downscaleImage does the 512px cap and
      // the final WebP encode; setOwnAvatar uploads and then writes the row.
      await setOwnAvatar(await downscaleImage(cropped));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Your photo could not be saved.');
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setBusy('remove');
    try {
      await removeOwnAvatar();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Your photo could not be removed.');
      setBusy(null);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={busy ? undefined : onClose}
        role="dialog"
        aria-modal="true"
        aria-label={editable ? 'Your photo' : `${name}'s photo`}
      >
        <div className="relative flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="absolute -top-2 -right-2 sm:-top-3 sm:-right-12 text-white/70 hover:text-white disabled:opacity-40 transition-colors p-2 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {showInitials ? (
            <div
              className={`${VIEWER_SIZE} rounded-full flex items-center justify-center font-bold tracking-wider text-7xl ring-4 ring-white/20 ${getColorForName(name)}`}
            >
              {getInitials(name)}
            </div>
          ) : (
            <img
              src={src ?? undefined}
              alt={name}
              onError={() => setHasError(true)}
              className={`${VIEWER_SIZE} rounded-full object-cover ring-4 ring-white/20 bg-gray-800`}
            />
          )}

          <p className="text-sm font-extrabold text-white text-center">{name}</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-xs font-semibold max-w-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {editable && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!busy}
                className="bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {busy === 'upload' ? 'Saving photo...' : 'Change photo'}
              </button>

              {hasStoredPhoto && (
                confirmRemove ? (
                  <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-white">Remove your photo?</span>
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={!!busy}
                      className="text-xs font-bold text-red-300 hover:text-red-200 disabled:opacity-50 cursor-pointer"
                    >
                      {busy === 'remove' ? 'Removing...' : 'Yes, remove'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(false)}
                      disabled={!!busy}
                      className="text-xs font-bold text-white/60 hover:text-white disabled:opacity-50 cursor-pointer"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={!!busy}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove photo
                  </button>
                )
              )}

              {/* accept= is a hint only; handlePickFile re-checks type and size. */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handlePickFile}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {pendingFile && (
        <AvatarCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onSave={handleCropSave}
        />
      )}
    </>,
    document.body
  );
}
export default AvatarViewerModal;
