import React from 'react';
import Avatar from '@/components/common/Avatar';
import type { Spotlight } from '@/data/spotlights';

export function SpotlightCard({ spotlight }: { spotlight: Spotlight }) {
  const isBlue = spotlight.theme === 'blue';

  if (isBlue) {
    return (
      <div className="bg-gradient-to-r from-[#177AE5] to-[#1258A3] text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center sm:items-start relative overflow-hidden gap-5 transition-all">
        {/* Avatar with Badge */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-4 border-yellow-400 p-0.5 shadow-lg overflow-hidden bg-white shrink-0">
            <Avatar src={spotlight.userAvatar} name={spotlight.userName} size="xl" />
          </div>
          <span className="absolute bottom-[-6px] bg-yellow-400 text-gray-900 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white shadow-sm whitespace-nowrap">
            {spotlight.badgeLabel || 'SPOTLIGHT'}
          </span>
        </div>

        {/* Details & Quote */}
        <div className="space-y-2.5 z-10 flex-1 text-center sm:text-left min-w-0">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-sky-200 font-black block">
              {spotlight.category || 'MEMBER SPOTLIGHT'}
            </span>
            <h4 className="font-extrabold text-base text-white mt-0.5 truncate">
              {spotlight.userName}
            </h4>
            {spotlight.userDepartment && (
              <span className="text-[10px] text-white/70 font-semibold block -mt-0.5">
                {spotlight.userDepartment}
              </span>
            )}
          </div>

          <p className="text-xs text-white/95 leading-relaxed font-semibold italic">
            "{spotlight.quote}"
          </p>

          {spotlight.tags && spotlight.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
              {spotlight.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-white/15 text-white border border-white/10 text-[9.5px] font-bold px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Theme: 'white' (Bordered Card)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 transition-all">
      {/* Avatar with Badge */}
      <div className="relative shrink-0 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full border-4 border-brand-blue/30 p-0.5 shadow-md overflow-hidden bg-white shrink-0">
          <Avatar src={spotlight.userAvatar} name={spotlight.userName} size="xl" />
        </div>
        <span className="absolute bottom-[-6px] bg-brand-blue text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white shadow-sm whitespace-nowrap">
          {spotlight.badgeLabel || 'HONOR'}
        </span>
      </div>

      {/* Details & Quote */}
      <div className="space-y-2 flex-1 text-center sm:text-left min-w-0">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-brand-blue font-black block">
            {spotlight.category || 'COMMUNITY SPOTLIGHT'}
          </span>
          <h4 className="font-extrabold text-base text-gray-900 mt-0.5 truncate">
            {spotlight.userName}
          </h4>
          {spotlight.userDepartment && (
            <span className="text-[10px] text-gray-400 font-semibold block -mt-0.5">
              {spotlight.userDepartment}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-semibold">
          "{spotlight.quote}"
        </p>

        {spotlight.tags && spotlight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
            {spotlight.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-700 border border-gray-200 text-[9.5px] font-bold px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default SpotlightCard;
