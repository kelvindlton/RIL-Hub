'use client';

import React from 'react';

export function BaseSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200/80 rounded-lg ${className}`} />;
}

// 1. Post Skeleton (for Community Feed)
export function PostSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BaseSkeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <BaseSkeleton className="w-28 h-3.5" />
            <BaseSkeleton className="w-20 h-2.5" />
          </div>
        </div>
        <BaseSkeleton className="w-14 h-5 rounded-full" />
      </div>

      <div className="space-y-2 pt-1">
        <BaseSkeleton className="w-full h-3.5" />
        <BaseSkeleton className="w-5/6 h-3.5" />
        <BaseSkeleton className="w-3/4 h-3.5" />
      </div>

      <div className="flex gap-2 pt-2">
        <BaseSkeleton className="w-14 h-5 rounded-md" />
        <BaseSkeleton className="w-16 h-5 rounded-md" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex gap-4">
          <BaseSkeleton className="w-12 h-6 rounded-md" />
          <BaseSkeleton className="w-12 h-6 rounded-md" />
          <BaseSkeleton className="w-12 h-6 rounded-md" />
        </div>
        <BaseSkeleton className="w-8 h-6 rounded-md" />
      </div>
    </div>
  );
}

// 2. Directory Member Card Skeleton
export function DirectoryCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center space-y-3">
      <BaseSkeleton className="w-16 h-16 rounded-full" />
      <div className="space-y-1.5 w-full flex flex-col items-center">
        <BaseSkeleton className="w-32 h-4" />
        <BaseSkeleton className="w-24 h-3" />
      </div>
      <BaseSkeleton className="w-20 h-5 rounded-full" />
      <div className="flex flex-wrap gap-1.5 justify-center w-full pt-2">
        <BaseSkeleton className="w-12 h-4 rounded-md" />
        <BaseSkeleton className="w-14 h-4 rounded-md" />
        <BaseSkeleton className="w-10 h-4 rounded-md" />
      </div>
      <div className="w-full pt-3 border-t border-gray-100 flex justify-between items-center">
        <BaseSkeleton className="w-16 h-3" />
        <BaseSkeleton className="w-16 h-7 rounded-lg" />
      </div>
    </div>
  );
}

// 3. Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <BaseSkeleton className="w-16 h-4 rounded-md" />
          <BaseSkeleton className="w-48 h-5" />
        </div>
        <BaseSkeleton className="w-12 h-12 rounded-xl" />
      </div>
      <div className="space-y-2">
        <BaseSkeleton className="w-full h-3" />
        <BaseSkeleton className="w-4/5 h-3" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <BaseSkeleton className="w-28 h-4" />
        <BaseSkeleton className="w-24 h-4" />
      </div>
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <BaseSkeleton className="w-20 h-4" />
        <BaseSkeleton className="w-24 h-8 rounded-lg" />
      </div>
    </div>
  );
}

// 4. Attendance Summary / Table Skeleton
export function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <BaseSkeleton className="w-20 h-3" />
            <BaseSkeleton className="w-16 h-7" />
            <BaseSkeleton className="w-28 h-2.5" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <BaseSkeleton className="w-36 h-5" />
          <BaseSkeleton className="w-24 h-8 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <BaseSkeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <BaseSkeleton className="w-24 h-3.5" />
                  <BaseSkeleton className="w-16 h-2.5" />
                </div>
              </div>
              <BaseSkeleton className="w-16 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. Message Skeleton
export function MessagesSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`flex items-start gap-3 max-w-md ${
            i % 2 === 0 ? 'ml-auto flex-row-reverse' : ''
          }`}
        >
          <BaseSkeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className={`space-y-1.5 ${i % 2 === 0 ? 'items-end' : ''}`}>
            <BaseSkeleton className="w-20 h-2.5" />
            <BaseSkeleton
              className={`h-10 rounded-2xl ${
                i % 2 === 0 ? 'w-48 bg-blue-100/60' : 'w-56'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 6. Welfare / Complaint Ticket Skeleton
export function WelfareCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <BaseSkeleton className="w-20 h-4 rounded-md" />
        <BaseSkeleton className="w-16 h-5 rounded-full" />
      </div>
      <BaseSkeleton className="w-48 h-4" />
      <BaseSkeleton className="w-full h-3" />
      <BaseSkeleton className="w-3/4 h-3" />
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <BaseSkeleton className="w-24 h-3" />
        <BaseSkeleton className="w-16 h-3" />
      </div>
    </div>
  );
}

// 7. Profile Skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <BaseSkeleton className="w-full h-32 bg-gray-300" />
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <BaseSkeleton className="w-24 h-24 rounded-full border-4 border-white shadow" />
            <div className="space-y-2 mt-2">
              <BaseSkeleton className="w-40 h-6" />
              <BaseSkeleton className="w-28 h-3.5" />
            </div>
          </div>
          <BaseSkeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <BaseSkeleton className="w-24 h-4" />
          <div className="space-y-2">
            <BaseSkeleton className="w-full h-3" />
            <BaseSkeleton className="w-5/6 h-3" />
          </div>
        </div>
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <BaseSkeleton className="w-32 h-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <BaseSkeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 8. Metric Card Skeleton (Reports)
export function MetricCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <BaseSkeleton className="w-24 h-3" />
          <div className="flex justify-between items-end pt-1">
            <BaseSkeleton className="w-16 h-7" />
            <BaseSkeleton className="w-14 h-4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 9. Trending Widget Skeleton (Feed sidebar)
export function TrendingWidgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <BaseSkeleton className="w-20 h-3.5" />
        <BaseSkeleton className="w-4 h-4 rounded" />
      </div>
      <div className="space-y-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <BaseSkeleton className="w-32 h-3.5" />
            <BaseSkeleton className="w-24 h-2.5" />
          </div>
        ))}
      </div>
      <BaseSkeleton className="w-full h-8 rounded-xl" />
    </div>
  );
}

// 10. Celebrations Widget Skeleton (Feed sidebar)
export function CelebrationsWidgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <BaseSkeleton className="w-24 h-3.5" />
        <BaseSkeleton className="w-4 h-4 rounded" />
      </div>
      <div className="space-y-3.5">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <BaseSkeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <BaseSkeleton className="w-28 h-3.5" />
              <BaseSkeleton className="w-20 h-2.5" />
            </div>
          </div>
        ))}
      </div>
      <BaseSkeleton className="w-full h-9 rounded-xl" />
    </div>
  );
}

// 11. Hub Engagement Bar Chart Skeleton (Feed sidebar)
export function HubEngagementSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <BaseSkeleton className="w-28 h-3.5" />
      <div className="h-28 flex items-end justify-around gap-2.5 pt-4">
        {[30, 50, 40, 80, 70, 20, 10].map((h, i) => (
          <div key={i} className="flex flex-col items-center flex-1 h-full">
            <div className="flex-1 w-full flex items-end min-h-0">
              <div
                className="w-full rounded-t-sm bg-gray-200/80 animate-pulse"
                style={{ height: `${h}%` }}
              />
            </div>
            <div className="w-5 h-2 mt-1.5 rounded bg-gray-200/80 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 12. Spotlight Card Skeleton (Feed Spotlights Tab)
export function SpotlightSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <div className="flex flex-col items-center shrink-0">
        <BaseSkeleton className="w-20 h-20 rounded-full" />
        <BaseSkeleton className="w-16 h-4 rounded-full mt-2" />
      </div>
      <div className="space-y-2.5 flex-1 min-w-0 w-full">
        <div className="space-y-1">
          <BaseSkeleton className="w-28 h-3" />
          <BaseSkeleton className="w-36 h-4" />
        </div>
        <BaseSkeleton className="w-full h-10 rounded-lg" />
        <div className="flex gap-2 pt-1">
          <BaseSkeleton className="w-20 h-4 rounded-full" />
          <BaseSkeleton className="w-24 h-4 rounded-full" />
        </div>
      </div>
    </div>
  );
}

