'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { DirectoryCardSkeleton } from '@/components/common/Skeletons';
import {
  Search,
  Filter,
  Award,
  Flame,
  Code,
  Users
} from 'lucide-react';
import Link from 'next/link';
import type { UserProfile } from '@/lib/mockDb';

function DirectoryContent() {
  const { profiles, isLoading, isError, errorMessage, refetchData } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'grid';

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCohort, setSelectedCohort] = useState('All');

  // Extract unique departments & cohorts
  const departments = ['All', ...Array.from(new Set(profiles.map(p => p.department)))];
  const cohorts = ['All', ...Array.from(new Set(profiles.map(p => p.programCohort)))];

  // Filtered profiles list
  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.skills.some(skill => skill.toLowerCase().includes(term));

    const matchesDept = selectedDept === 'All' || p.department === selectedDept;
    const matchesCohort = selectedCohort === 'All' || p.programCohort === selectedCohort;

    return matchesSearch && matchesDept && matchesCohort;
  });

  // Group members by skill for Skills Analysis tab
  const skillGroups: { [skill: string]: UserProfile[] } = {};
  profiles.forEach(p => {
    p.skills.forEach(s => {
      if (!skillGroups[s]) {
        skillGroups[s] = [];
      }
      skillGroups[s].push(p);
    });
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700 border border-red-200';
      case 'admin': return 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20';
      case 'staff': return 'bg-blue-green/10 text-blue-green border border-blue-green/20';
      case 'alumni': return 'bg-gray-100 text-gray-700 border border-gray-200';
      case 'partner': return 'bg-purple-100 text-purple-700 border border-purple-200';
      default: return 'bg-brand-green/10 text-brand-green border border-brand-green/20';
    }
  };

  const getRoleName = (role: string) => {
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDept('All');
    setSelectedCohort('All');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Member Directory</h2>
          <p className="text-xs text-gray-500 mt-1">
            Browse the global ecosystem of Renaissance Innovation Labs. Find builders, team leads, embedded hardware experts, and startup founders.
          </p>
        </div>

        {tab === 'grid' ? (
          /* --- TABS 1: REGISTRY GRID VIEW --- */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Main controls */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or skill (e.g. Python, React)..."
                  className="bg-transparent border-none text-xs text-brand-black focus:ring-0 focus:outline-none ml-2 w-full font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dept</span>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-blue"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cohort</span>
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                    className="bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-blue"
                  >
                    {cohorts.map(cohort => (
                      <option key={cohort} value={cohort}>{cohort}</option>
                    ))}
                  </select>
                </div>

                {(searchTerm || selectedDept !== 'All' || selectedCohort !== 'All') && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-brand-blue font-bold hover:underline px-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Grid layout */}
            {isLoading && profiles.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <DirectoryCardSkeleton key={i} />
                ))}
              </div>
            ) : isError && profiles.length === 0 ? (
              <ErrorState
                title="Could not load member directory"
                message={errorMessage || 'We were unable to load directory data. Please retry.'}
                onRetry={refetchData}
              />
            ) : filteredProfiles.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members found"
                description={
                  searchTerm || selectedDept !== 'All' || selectedCohort !== 'All'
                    ? `No members match your current filter criteria. Try searching for a different keyword or resetting filters.`
                    : "No community members registered in the directory yet."
                }
                actionLabel={searchTerm || selectedDept !== 'All' || selectedCohort !== 'All' ? "Reset Search & Filters" : undefined}
                onAction={resetFilters}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/profile/${p.id}`)}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-brand-blue/30 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[12.5rem] relative overflow-hidden group"
                  >
                    <div className="flex items-start gap-3.5">
                      <Avatar
                        src={p.avatar}
                        name={p.name}
                        size="lg"
                        className="shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-gray-900 leading-tight truncate group-hover:text-brand-blue transition-colors">
                          {p.name}
                        </h4>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 ${getRoleBadgeColor(p.role)}`}>
                          {getRoleName(p.role)}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium truncate">
                          {p.department} · {p.programCohort}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1">
                      {p.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="bg-gray-100 text-gray-600 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {p.skills.length > 3 && (
                        <span className="bg-gray-100 text-gray-400 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          +{p.skills.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-2.5 mt-3 flex items-center justify-between text-gray-400">
                      <span className="text-[9.5px] font-bold text-brand-blue flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        {p.points} Points
                      </span>

                      {p.streak > 0 && (
                        <span className="text-[9.5px] text-orange-500 font-bold flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 shrink-0 fill-orange-500/10" />
                          {p.streak}d streak
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* --- TABS 2: SKILLS ANALYSIS VIEW --- */
          <div className="animate-in fade-in duration-200">
            {Object.keys(skillGroups).length === 0 ? (
              <EmptyState
                icon={Code}
                title="No skills recorded yet"
                description="Members have not tagged any technical or design skills yet."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(skillGroups).map(([skill, members]) => (
                  <div key={skill} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                        <Code className="w-4.5 h-4.5 text-brand-blue shrink-0" />
                        {skill}
                      </h4>
                      <span className="bg-brand-blue/10 text-brand-blue text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {members.length} {members.length === 1 ? 'Expert' : 'Experts'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={m.avatar} name={m.name} size="xs" className="shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 leading-tight truncate">{m.name}</p>
                              <span className="text-[9px] text-gray-400 font-semibold truncate block">{m.programCohort}</span>
                            </div>
                          </div>
                          <Link
                            href={`/profile/${m.id}`}
                            className="text-[10px] font-extrabold text-brand-blue hover:underline shrink-0 ml-2"
                          >
                            View Passport →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

export default function MemberDirectory() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading directory registry...
      </div>
    }>
      <DirectoryContent />
    </Suspense>
  );
}
