'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white border border-gray-200/80 rounded-2xl shadow-sm ${className}`}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-blue mb-4 shadow-sm">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.75} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-brand-black mb-1.5 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm shadow-brand-blue/20"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm shadow-brand-blue/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
