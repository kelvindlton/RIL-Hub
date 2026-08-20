'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import type { UserProfile } from '@/lib/mockDb';

interface CreateSpotlightModalProps {
  open: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  onSubmit: (data: {
    userId: string;
    category: string;
    badgeLabel: string;
    quote: string;
    tags: string[];
    theme: 'blue' | 'white';
  }) => Promise<void>;
}

const CATEGORY_PRESETS = [
  'MEMBER SPOTLIGHT',
  'DESIGN SPOTLIGHT',
  'TECH INNOVATOR',
  'HARDWARE HERO',
  'COMMUNITY LEADER',
];

export function CreateSpotlightModal({
  open,
  onClose,
  profiles,
  onSubmit,
}: CreateSpotlightModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [category, setCategory] = useState<string>('MEMBER SPOTLIGHT');
  const [badgeLabel, setBadgeLabel] = useState<string>('SPOTLIGHT');
  const [quote, setQuote] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [theme, setTheme] = useState<'blue' | 'white'>('blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize default selected user as soon as profiles finish loading
  useEffect(() => {
    if (!selectedUserId && profiles.length > 0) {
      setSelectedUserId(profiles[0].id);
    }
  }, [profiles, selectedUserId]);

  if (!open) return null;

  const selectedProfile = profiles.find((p) => p.id === selectedUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Please select a member to spotlight.');
      return;
    }
    if (!quote.trim()) {
      setError('Please provide a highlight quote or testimonial.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onSubmit({
        userId: selectedUserId,
        category: category.trim() || 'MEMBER SPOTLIGHT',
        badgeLabel: badgeLabel.trim() || 'SPOTLIGHT',
        quote: quote.trim(),
        tags: parsedTags,
        theme,
      });

      // Reset fields
      setQuote('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish spotlight. Please try again.');
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
            <Sparkles className="w-5 h-5 text-brand-blue" />
            <h3 className="text-sm font-extrabold text-gray-900">Feature a Member Spotlight</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Member Selection */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Select Community Member</label>
            {profiles.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-400 italic">
                No member profiles found in the directory.
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department || p.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Member Preview Pill */}
          {selectedProfile && (
            <div className="flex items-center gap-3 bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-3">
              <Avatar src={selectedProfile.avatar} name={selectedProfile.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-gray-900 truncate">{selectedProfile.name}</p>
                <p className="text-[10px] text-gray-500 font-semibold truncate">
                  {selectedProfile.department} · {selectedProfile.role}
                </p>
              </div>
            </div>
          )}

          {/* Category & Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Category Title</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. MEMBER SPOTLIGHT"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Badge Pill Label</label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                placeholder="e.g. SPOTLIGHT / CSS WIZARD"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          {/* Preset Category Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCategory(preset)}
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                  category === preset
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Quote / Testimonial */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">
              Highlight Narrative / Quote
            </label>
            <textarea
              rows={3}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What makes this member's contribution, project, or milestone outstanding this month?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">
              Tags / Capsules (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. IoT Lab Cohort 2025, Hardware Innovation, Top Mentor"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>

          {/* Visual Theme Picker */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">Card Theme</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('blue')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-left transition-all ${
                  theme === 'blue'
                    ? 'border-brand-blue ring-2 ring-brand-blue/20 bg-brand-blue/5'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 shrink-0" />
                <div>
                  <p className="font-extrabold text-gray-900 text-[11px]">Primary Blue Hero</p>
                  <p className="text-[9.5px] text-gray-500">Bold gradient with gold badge</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('white')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-left transition-all ${
                  theme === 'white'
                    ? 'border-brand-blue ring-2 ring-brand-blue/20 bg-brand-blue/5'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white border-2 border-brand-blue shrink-0" />
                <div>
                  <p className="font-extrabold text-gray-900 text-[11px]">Clean White</p>
                  <p className="text-[9.5px] text-gray-500">Minimal card with blue badge</p>
                </div>
              </button>
            </div>
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
              disabled={isSubmitting || !quote.trim() || profiles.length === 0}
              className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-blue/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting ? 'Publishing...' : 'Publish Spotlight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default CreateSpotlightModal;
