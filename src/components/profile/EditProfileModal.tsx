'use client';

import React, { useState } from 'react';
import { X, UserCog, AlertCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/mockDb';

// Mirrors the DB CHECKs from 20260828000000_profile_bio_and_socials.sql so a bad
// value gets a readable message here instead of surfacing as a Postgres constraint
// violation. The DB remains the actual enforcement point — this is convenience.
const HEADLINE_MAX = 120;
const BIO_MAX = 500;
const URL_RE = /^https?:\/\//i;

type ProfileEdits = Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSubmit: (updates: ProfileEdits) => Promise<void>;
}

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

export function EditProfileModal({ open, onClose, profile, onSubmit }: EditProfileModalProps) {
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

  if (!open) return null;

  const parseList = (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean);

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
    try {
      // Blank strings are intentional: updateProfile() converts them to NULL, which
      // is how a member clears a field.
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
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save your profile. Please try again.');
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default EditProfileModal;
