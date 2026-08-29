'use client';

import React, { useRef, useState } from 'react';
import { X, UserCog, AlertCircle, Camera } from 'lucide-react';
import type { UserProfile } from '@/lib/mockDb';
import Avatar from '@/components/common/Avatar';
import { ACCEPTED_IMAGE_TYPES, downscaleImage, validateImageFile } from '@/lib/image';
import AvatarCropModal from '@/components/profile/AvatarCropModal';

// Mirrors the DB CHECKs from 20260828000000_profile_bio_and_socials.sql so a bad
// value gets a readable message here instead of surfacing as a Postgres constraint
// violation. The DB remains the actual enforcement point — this is convenience.
const HEADLINE_MAX = 120;
const BIO_MAX = 500;
const URL_RE = /^https?:\/\//i;

// ACCEPTED_IMAGE_TYPES / MAX_SOURCE_BYTES / validateImageFile moved to
// @/lib/image — the avatar viewer picks files too, and the rules must not drift.

type ProfileEdits = Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSubmit: (updates: ProfileEdits) => Promise<void>;
  onUploadAvatar: (image: Blob) => Promise<string>;
}

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

export function EditProfileModal({ open, onClose, profile, onSubmit, onUploadAvatar }: EditProfileModalProps) {
  // Seeded from `profile` at mount. The parent mounts this only while open, so every
  // open starts from the saved values — cancelling never leaves stale edits behind.
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [department, setDepartment] = useState(profile.department || '');
  const [programCohort, setProgramCohort] = useState(profile.programCohort || '');
  const [skillsInput, setSkillsInput] = useState((profile.skills || []).join(', '));
  const [interestsInput, setInterestsInput] = useState((profile.interests || []).join(', '));
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // pendingFile is the raw pick, held only while the crop modal is open.
  // croppedAvatar is what comes back OUT of the cropper — that is what gets
  // uploaded, and avatarPreview is an object URL for it. uploadedAvatarUrl caches
  // a SUCCESSFUL upload, so if the profile save then fails, pressing Save Changes
  // again reuses the stored file rather than uploading the same bytes twice.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [croppedAvatar, setCroppedAvatar] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const parseList = (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean);

  // Object URLs are revoked the moment they're replaced or discarded. Doing that
  // in the handlers rather than a useEffect cleanup keeps this component free of
  // effects (the project lints react-hooks/set-state-in-effect as an error).
  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so the SAME file can be picked again after a rejection —
    // otherwise re-choosing it fires no change event.
    e.target.value = '';
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    // No preview yet — the member crops first, and the CROP is what gets
    // previewed and uploaded.
    setError(null);
    setPendingFile(file);
  };

  const handleCropSave = (cropped: Blob) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setPendingFile(null);
    setCroppedAvatar(cropped);
    setAvatarPreview(URL.createObjectURL(cropped));
    setUploadedAvatarUrl(null);   // any earlier upload no longer matches the pick
  };

  const clearPickedFile = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setCroppedAvatar(null);
    setAvatarPreview(null);
    setUploadedAvatarUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }
    if (headline.trim().length > HEADLINE_MAX) {
      setError(`Headline must be ${HEADLINE_MAX} characters or fewer.`);
      return;
    }
    if (bio.trim().length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }
    const links: [string, string][] = [
      ['LinkedIn', linkedinUrl],
      ['GitHub', githubUrl],
      ['Website', websiteUrl],
    ];
    for (const [label, value] of links) {
      if (value.trim() && !URL_RE.test(value.trim())) {
        setError(`${label} link must start with http:// or https:// — or be left blank.`);
        return;
      }
    }

    setIsSubmitting(true);

    // Photo first, row second: avatar_url must never name a file that isn't in
    // storage yet. A cached uploadedAvatarUrl means this is a retry.
    let avatarUrl = uploadedAvatarUrl;
    if (croppedAvatar && !avatarUrl) {
      try {
        const image = await downscaleImage(croppedAvatar);
        avatarUrl = await onUploadAvatar(image);
        setUploadedAvatarUrl(avatarUrl);
      } catch (err: unknown) {
        // FAILURE MODE 1 — the profile row is deliberately left untouched.
        const detail = err instanceof Error ? err.message : 'Please try again.';
        setError(`Your photo could not be uploaded, so nothing was saved. ${detail}`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Blank strings are intentional: updateProfile() converts them to NULL, which
      // is how a member clears a field. `avatar` is included ONLY when a new photo
      // was actually uploaded — otherwise the existing avatar_url is left alone.
      await onSubmit({
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        department: department.trim(),
        programCohort: programCohort.trim(),
        skills: parseList(skillsInput),
        interests: parseList(interestsInput),
        linkedinUrl: linkedinUrl.trim(),
        githubUrl: githubUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      });
      onClose();
    } catch (err: unknown) {
      // FAILURE MODE 2 — the file IS in storage but the row doesn't point at it.
      // Say so plainly; uploadedAvatarUrl makes the retry reuse the stored file.
      const detail = err instanceof Error ? err.message : 'Failed to save your profile. Please try again.';
      setError(
        avatarUrl
          ? `Your new photo uploaded, but your profile details didn't save. ${detail} Press Save Changes to try again — your photo is already stored.`
          : detail
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-brand-blue" />
            <h3 className="text-sm font-extrabold text-gray-900">Edit Your Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {/* Photo — picked and previewed here, uploaded on submit */}
          <div className="flex items-center gap-4 pb-1">
            {/* key remounts Avatar per src: its internal error flag never resets,
                so without this one failed preview would show initials until the
                modal was closed and reopened. */}
            <Avatar
              key={avatarPreview || profile.avatar}
              src={avatarPreview || profile.avatar}
              name={profile.name}
              size="xl"
              className="shrink-0"
            />
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {croppedAvatar ? 'Choose a different photo' : 'Change photo'}
                </button>
                {croppedAvatar && (
                  <button
                    type="button"
                    onClick={clearPickedFile}
                    className="text-gray-500 hover:text-gray-700 font-bold px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Keep current
                  </button>
                )}
              </div>
              <p className="text-[9.5px] text-gray-400 font-semibold">
                PNG, JPEG or WebP. You&apos;ll be able to crop and rotate it — nothing is uploaded until you save.
              </p>
              {/* accept= is a hint only; handlePickFile re-checks type and size. */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handlePickFile}
                className="hidden"
              />
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          {/* Headline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700">Headline</label>
              <span className={`text-[9.5px] font-bold ${headline.length > HEADLINE_MAX ? 'text-red-500' : 'text-gray-400'}`}>
                {headline.length}/{HEADLINE_MAX}
              </span>
            </div>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Embedded Systems Engineer · IoT Sandbox"
              className={inputClass}
            />
            <p className="text-[9.5px] text-gray-400 font-semibold mt-1">
              Shown under your name. Leave blank to use your role and department instead.
            </p>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700">About / Bio</label>
              <span className={`text-[9.5px] font-bold ${bio.length > BIO_MAX ? 'text-red-500' : 'text-gray-400'}`}>
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you building, learning, or looking to collaborate on?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none"
            />
          </div>
          {/* Phone & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className={inputClass} />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Cohort */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Programme / Cohort</label>
            <input type="text" value={programCohort} onChange={(e) => setProgramCohort(e.target.value)} className={inputClass} />
          </div>

          {/* Skills */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Skills (comma separated)</label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. React, PostgreSQL, Embedded C"
              className={inputClass}
            />
          </div>

          {/* Interests */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Interests (comma separated)</label>
            <input
              type="text"
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
              placeholder="e.g. Robotics, Open Source, Solar Energy"
              className={inputClass}
            />
          </div>
          {/* Links */}
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <p className="font-bold text-gray-700 pt-3">Links</p>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={inputClass}
            />
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/..."
              className={inputClass}
            />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-site.com"
              className={inputClass}
            />
            <p className="text-[9.5px] text-gray-400 font-semibold">
              Must start with http:// or https://. Leave blank to remove a link.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-blue/20 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
              {isSubmitting
                ? croppedAvatar && !uploadedAvatarUrl
                  ? 'Uploading photo...'
                  : 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {pendingFile && (
        <AvatarCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
export default EditProfileModal;
