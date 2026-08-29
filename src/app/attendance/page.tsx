'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { AttendanceSkeleton } from '@/components/common/Skeletons';
import {
  QrCode,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  Award,
  Zap,
  RotateCcw,
  Lock,
  UserCheck,
  Flame,
  Calendar,
  History,
  Copy,
  Check
} from 'lucide-react';

const MOCK_HISTORICAL_EVENTS = [
  { id: 'hist-1', title: 'Q1 Innovation Pitching Day', date: '2026-03-12', time: '10:00 - 15:00', category: 'program', points: 50, method: 'QR Code', status: 'present', qrCodeHash: undefined },
  { id: 'hist-2', title: 'Hardware Labs Safety Induction', date: '2026-04-05', time: '09:00 - 12:00', category: 'workshop', points: 50, method: 'Self Check-in', status: 'present', qrCodeHash: undefined },
  { id: 'hist-3', title: 'RIL Alumni Pitch Prep', date: '2026-04-18', time: '16:00 - 18:00', category: 'social', points: 50, method: 'Admin Manual', status: 'present', qrCodeHash: undefined },
  { id: 'hist-4', title: 'Introduction to IoT Cloud Integrations', date: '2026-05-02', time: '14:00 - 16:30', category: 'workshop', points: 0, method: '-', status: 'absent', qrCodeHash: undefined },
  { id: 'hist-5', title: 'Monthly Ideas Pitch-athon', date: '2026-05-18', time: '11:00 - 14:00', category: 'program', points: 50, method: 'QR Code', status: 'present', qrCodeHash: undefined },
];

function AttendanceContent() {
  const { events, profiles, currentUser, isUserLoading, isLoading, isError, errorMessage, refetchData, checkInUser } = useApp();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'tracker';

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'staff';

  // State
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [passcode, setPasscode] = useState('');
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string } | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleSelfCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const targetEvent = events.find(ev => ev.id === selectedEventId);
    if (!targetEvent) return;

    if (targetEvent.checkedInUsers.includes(currentUser.id)) {
      setCheckInResult({ success: false, message: 'You have already checked in for this event.' });
      return;
    }

    if (passcode.trim() === targetEvent.qrCodeHash) {
      const res = await checkInUser(selectedEventId, currentUser.id, 'qr');
      setCheckInResult(res);
      setPasscode('');
    } else {
      setCheckInResult({ success: false, message: 'Invalid check-in passcode. Please verify the code and try again.' });
    }
  };

  const handleManualCheckin = async (eventId: string, userId: string) => {
    const res = await checkInUser(eventId, userId, 'manual');
    showToast(res.message);
  };

  const filteredProfilesForManual = profiles.filter(p =>
    p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
    p.programCohort.toLowerCase().includes(manualSearch.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const liveHistory = events.map(e => {
    const isCheckedIn = e.checkedInUsers.includes(currentUser.id);
    const isPast = e.date < todayStr;
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      category: e.category,
      points: isCheckedIn ? 50 : 0,
      method: isCheckedIn ? 'Self Check-in' : '-',
      status: isCheckedIn ? 'present' : isPast ? 'absent' : 'upcoming',
      qrCodeHash: e.qrCodeHash
    };
  });

  const combinedHistory = [...liveHistory, ...MOCK_HISTORICAL_EVENTS].sort((a, b) => b.date.localeCompare(a.date));

  const attendedEntries = combinedHistory.filter(h => h.status === 'present');
  const totalPastAndAttended = combinedHistory.filter(h => h.status === 'present' || h.status === 'absent');
  const attendanceRate = totalPastAndAttended.length > 0
    ? Math.round((attendedEntries.length / totalPastAndAttended.length) * 100)
    : 100;
  const totalXP = attendedEntries.length * 50;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'program':
        return 'bg-teal-50 text-teal-700 border-teal-200/50';
      case 'workshop':
        return 'bg-brand-blue/5 text-brand-blue border-brand-blue/10';
      case 'hackathon':
        return 'bg-purple-50 text-purple-700 border-purple-200/50';
      case 'social':
        return 'bg-pink-50 text-pink-700 border-pink-200/50';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Attendance Portal</h2>
          <p className="text-xs text-gray-500 mt-1">
            Track your hub sessions turnout, verify ongoing meetings attendance, and review your historical records.
          </p>
        </div>

        {tab === 'manual' ? (
          /* --- TABS 2: ADMIN MANUAL CHECK-IN REGISTRY --- */
          isAdmin ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 max-w-2xl animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-brand-blue font-bold uppercase tracking-widest">Administrator backup console</span>
                  <h4 className="font-extrabold text-sm text-gray-900 mt-0.5">
                    Manual check-in registry
                  </h4>
                </div>
                <UserCheck className="w-5 h-5 text-brand-blue" />
              </div>

              {/* Event Select Dropdown */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Target Event</label>
                <select
                  value={selectedEventId || (events[0]?.id || '')}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              {/* Filter search box */}
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-md">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Filter names or cohorts..."
                  className="bg-transparent border-none text-xs text-brand-black focus:ring-0 focus:outline-none w-full ml-2 font-semibold"
                />
              </div>

              {activeEvent ? (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-1">
                  {filteredProfilesForManual.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No members match "{manualSearch}"
                    </div>
                  ) : (
                    filteredProfilesForManual.map((p) => {
                      const isCheckedIn = activeEvent.checkedInUsers.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-3 text-xs font-semibold"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={p.avatar} name={p.name} size="sm" className="shrink-0" viewable />
                            <div className="min-w-0">
                              <p className="font-extrabold text-gray-900 leading-tight truncate">{p.name}</p>
                              <span className="text-[9.5px] text-gray-400 block mt-0.5">{p.programCohort}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleManualCheckin(activeEvent.id, p.id)}
                            disabled={isCheckedIn}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[10.5px] border shadow-sm transition-colors ${
                              isCheckedIn
                                ? 'bg-brand-green/10 text-brand-green border-brand-green/20 cursor-default'
                                : 'bg-brand-blue text-white border-transparent hover:bg-blue-600'
                            }`}
                          >
                            {isCheckedIn ? '✓ Verified' : 'Check In'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Configure an event schedule first.</div>
              )}
            </div>
          ) : (
            <div className="max-w-md bg-white border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-sm animate-in fade-in">
              <Lock className="w-10 h-10 text-red-500 mx-auto" />
              <h4 className="font-extrabold text-sm text-gray-950">Access Restricted</h4>
              <p className="text-xs text-gray-500">Only administrators or hub coordinators can perform manual check-ins. Please switch persona roles to test.</p>
            </div>
          )
        ) : (
          /* --- TABS 1: MY ATTENDANCE DASHBOARD --- */
          isLoading && events.length === 0 ? (
            <AttendanceSkeleton />
          ) : isError && events.length === 0 ? (
            <ErrorState
              title="Could not load attendance portal"
              message={errorMessage || 'Failed to sync attendance logs with Supabase.'}
              onRetry={refetchData}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-200">
              
              {/* Left Main Dashboard Layout */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Profile Card & Banner */}
                <div className="bg-gradient-to-r from-brand-black to-gray-800 rounded-2xl border border-gray-800 text-white p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <QrCode className="w-48 h-48 text-white" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={currentUser.avatar}
                        name={currentUser.name}
                        size="xl"
                        className="border-2 border-brand-blue shrink-0"
                        loading={isUserLoading}
                        viewable
                        editable={!isUserLoading}
                      />
                      <div>
                        <h3 className="font-extrabold text-base leading-snug">
                          {isUserLoading ? <span className="inline-block w-32 h-4 bg-white/20 animate-pulse rounded" aria-hidden="true" /> : currentUser.name}
                        </h3>
                        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider block mt-0.5">
                          {isUserLoading ? <span className="inline-block w-24 h-2.5 bg-white/15 animate-pulse rounded" aria-hidden="true" /> : currentUser.programCohort}
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {!isUserLoading && currentUser.badges.slice(0, 2).map((badge) => (
                            <span
                              key={badge}
                              className="bg-brand-blue/20 text-sky-blue border border-brand-blue/30 rounded-full px-2 py-0.5 text-[8.5px] font-bold"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Flame Streak Container */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 px-4 py-2 flex items-center gap-2 self-start sm:self-center shrink-0">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-300 block leading-none">Active Streak</span>
                        <span className="text-xs font-black text-white block mt-0.5">
                          {isUserLoading ? <span className="inline-block w-8 h-3 bg-white/20 animate-pulse rounded align-middle" aria-hidden="true" /> : `${currentUser.streak} Sessions`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block tracking-wider">Attendance Rate</span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-black text-brand-black">{attendanceRate}%</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-1">Overall turnout score</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block tracking-wider">Sessions Attended</span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-black text-brand-green">{attendedEntries.length}</span>
                      <span className="text-xs text-gray-400 font-bold">/ {totalPastAndAttended.length}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-1">Present vs. scheduled</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block tracking-wider">Active Streak</span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-black text-orange-500">
                        {isUserLoading ? <span className="inline-block w-8 h-5 bg-gray-200 animate-pulse rounded align-middle" aria-hidden="true" /> : currentUser.streak}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">Days</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-1">Loyalty check-in streak</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block tracking-wider">Attendance XP</span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-black text-brand-blue">+{totalXP}</span>
                      <span className="text-xs text-gray-400 font-bold">XP</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-1">Claimed points score</span>
                  </div>
                </div>

                {/* Self Check-In Form Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="font-extrabold text-sm text-gray-900">Self Check-In Console</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Are you currently attending a live session at the hub? Validate your attendance instantly.</p>
                  </div>

                  {checkInResult ? (
                    <div className={`rounded-xl border p-4 text-center space-y-3 ${
                      checkInResult.success
                        ? 'bg-brand-green/5 border-brand-green/30 text-brand-green'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {checkInResult.success ? (
                        <>
                          <CheckCircle className="w-9 h-9 mx-auto animate-bounce text-brand-green" />
                          <div>
                            <h5 className="font-bold text-xs">Self Check-In Confirmed!</h5>
                            <p className="text-[10.5px] text-gray-600 mt-0.5">{checkInResult.message}</p>
                          </div>
                          <div className="bg-white border border-brand-green/20 rounded-lg py-1.5 px-3 flex justify-around text-[10px] font-bold text-gray-800 shadow-sm max-w-xs mx-auto">
                            <span className="text-brand-blue flex items-center gap-1"><Award className="w-3.5 h-3.5" /> +50 Points</span>
                            <span className="text-orange-500 flex items-center gap-1"><Zap className="w-3.5 h-3.5 fill-orange-500/10" /> Streak Up</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-9 h-9 mx-auto text-red-600 animate-pulse" />
                          <div>
                            <h5 className="font-bold text-xs">Check-In Denied</h5>
                            <p className="text-[10.5px] text-gray-600 mt-0.5">{checkInResult.message}</p>
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => setCheckInResult(null)}
                        className="text-[10.5px] font-bold text-brand-blue underline"
                      >
                        Dismiss Response
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSelfCheckIn} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9.5px] uppercase font-bold text-gray-400 block mb-1">Target Session / Event</label>
                          <select
                            value={selectedEventId || (events[0]?.id || '')}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
                          >
                            {events.map(ev => (
                              <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[9.5px] uppercase font-bold text-gray-400 block mb-1">Verification Passcode</label>
                          <input
                            type="text"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="e.g. qr_ril_..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800 placeholder-gray-400"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!passcode.trim()}
                        className="w-full bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        Verify Passcode & Register
                      </button>
                    </form>
                  )}
                </div>

                {/* Attendance Ledger History */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">Attendance Ledger</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Chronological record of scheduled events and verification status.</p>
                  </div>

                  {combinedHistory.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No attendance records"
                      description="You do not have any past or active attendance logs recorded yet."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold text-gray-700">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Event Session</th>
                            <th className="py-2.5">Category</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {combinedHistory.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3">
                                <div>
                                  <p className="font-extrabold text-gray-900 leading-tight">{row.title}</p>
                                  <span className="text-[9.5px] text-gray-400 block mt-0.5">{row.time}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getCategoryBadge(row.category)}`}>
                                  {row.category}
                                </span>
                              </td>
                              <td className="py-3 text-[11px] text-gray-500 font-bold">{row.date}</td>
                              <td className="py-3">
                                {row.status === 'present' ? (
                                  <span className="inline-flex items-center gap-1 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span>
                                    ✓ Present
                                  </span>
                                ) : row.status === 'absent' ? (
                                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200/50 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                    ✗ Missed
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                      Upcoming
                                    </span>
                                    
                                    {row.qrCodeHash && (
                                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-gray-400 mt-1">
                                        <span>Code: <code className="bg-gray-100 px-1 py-0.5 rounded text-brand-blue">{row.qrCodeHash}</code></span>
                                        <button
                                          onClick={() => handleCopy(row.qrCodeHash || '', row.id)}
                                          className="text-brand-blue hover:text-blue-700 font-bold text-[9px]"
                                        >
                                          {copiedId === row.id ? 'Copied ✓' : 'Copy'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-right font-black text-gray-900">
                                {row.status === 'present' ? '+50 XP' : '0 XP'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Metrics Sidebar (Renders Event Headcount) */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Event Headcount
                  </h4>
                  
                  {activeEvent ? (
                    <div className="text-xs space-y-3.5">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Schedules Summary</span>
                        <span className="font-extrabold text-gray-900 leading-tight block mt-0.5">{activeEvent.title}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-3 text-center border border-gray-200/50 font-bold">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Checked In</span>
                          <span className="text-sm font-extrabold text-brand-green mt-0.5 block">
                            {activeEvent.checkedInUsers.length} members
                          </span>
                        </div>
                        <div className="border-l border-gray-200">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Total RSVPs</span>
                          <span className="text-sm font-extrabold text-brand-blue mt-0.5 block">
                            {activeEvent.rsvpCount} seats
                          </span>
                        </div>
                      </div>

                      {activeEvent.checkedInUsers.length > 0 ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Validated Members ({activeEvent.checkedInUsers.length})</span>
                          <div className="flex flex-wrap gap-1.5">
                            {activeEvent.checkedInUsers.map((userId) => {
                              const user = profiles.find(p => p.id === userId);
                              if (!user) return null;
                              return (
                                <div
                                  key={userId}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full"
                                  title={user.name}
                                >
                                  <Avatar src={user.avatar} name={user.name} size="xs" viewable />
                                  <span className="text-[9.5px] font-bold text-gray-700">{user.name.split(' ')[0]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[10px] text-gray-400 italic">
                          No members validated for this session yet.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No events configured.</div>
                  )}
                </div>
              </div>

            </div>
          )
        )}

      </div>

      {/* Transient Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-brand-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-brand-green" />
          {toastMessage}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AttendanceQRScanner() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading attendance gate...
      </div>
    }>
      <AttendanceContent />
    </Suspense>
  );
}
