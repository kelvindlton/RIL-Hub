'use client';

import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { createPortal } from 'react-dom';
import { X, RefreshCw, ZoomIn, RotateCw, Check } from 'lucide-react';
import { cropImage } from '@/lib/image';

// Square, because the output is always shown in a circle.
const ASPECT = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const CENTERED: Point = { x: 0, y: 0 };

interface AvatarCropModalProps {
  file: File;
  onCancel: () => void;
  onSave: (cropped: Blob) => void;
}

const sliderClass = 'flex-1 accent-brand-blue cursor-pointer';

export function AvatarCropModal({ file, onCancel, onSave }: AvatarCropModalProps) {
  // The object URL is created once per mount (the parent mounts this only while a
  // file is pending) and revoked in the two exit handlers below rather than in a
  // useEffect cleanup — the project lints react-hooks/set-state-in-effect as an
  // error and this component stays effect-free.
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Point>(CENTERED);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setCrop(CENTERED);
    setZoom(MIN_ZOOM);
    setRotation(0);
  };

  const handleCancel = () => {
    URL.revokeObjectURL(imageSrc);
    onCancel();
  };

  const handleSave = async () => {
    // onCropComplete fires once the media has loaded, so this is only null if the
    // image never decoded — in which case cropping it is meaningless.
    if (!croppedAreaPixels) {
      setError('That image could not be read. Please choose a different file.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    try {
      // Geometry only. The 512px cap and the final WebP encode still happen in
      // downscaleImage(), one step further along the existing pipeline.
      const cropped = await cropImage(file, croppedAreaPixels, rotation);
      URL.revokeObjectURL(imageSrc);
      onSave(cropped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'That image could not be processed.');
      setIsProcessing(false);
    }
  };

  // Portalled to <body> because this opens from inside EditProfileModal's own
  // fixed overlay. A fixed element nested in a subtree that ever gains a
  // transform positions against that ancestor instead of the viewport, and
  // portalling also removes any doubt about stacking order.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust your photo"
    >
      {/* No scale-based entrance: react-easy-crop measures its container, and an
          animation that changes those dimensions mid-open misplaces the crop. */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-extrabold text-gray-900">Adjust your photo</h3>
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper is position:absolute — it needs a relative parent with a real
            height or it fills the page. */}
        <div className="relative w-full h-72 sm:h-80 bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECT}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            cropShape="round"
            showGrid={false}
            restrictPosition
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 font-semibold">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label htmlFor="avatar-zoom" className="text-gray-500" title="Zoom">
              <ZoomIn className="w-4 h-4" />
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={sliderClass}
              aria-label="Zoom"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="avatar-rotation" className="text-gray-500" title="Rotate">
              <RotateCw className="w-4 h-4" />
            </label>
            <input
              id="avatar-rotation"
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className={sliderClass}
              aria-label="Rotate"
            />
          </div>

          <p className="text-[9.5px] text-gray-400 font-semibold">
            Drag the photo to reposition it. Only the area inside the circle is saved.
          </p>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-blue/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {isProcessing ? 'Processing...' : 'Save photo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
export default AvatarCropModal;
