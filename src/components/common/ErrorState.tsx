'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = 'Unable to load content',
  message = 'We encountered an issue connecting to the service. Please check your connection and try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 bg-red-50/50 border border-red-100 rounded-2xl ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-100/80 text-red-600 flex items-center justify-center mb-3.5 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-gray-600 max-w-sm mb-5 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
