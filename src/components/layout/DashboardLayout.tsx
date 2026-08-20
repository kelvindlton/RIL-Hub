'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import DailyCheckInModal from '@/components/attendance/DailyCheckInModal';
import Avatar from '@/components/common/Avatar';
import {
  Home,
  Users,
  Calendar,
  QrCode,
  MessageSquare,
  HeartHandshake,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  Zap,
  Award,
  Search,
  Check,
  LayoutGrid,
  CircleHelp,
  Bell,
  MessageCircle,
  Gift,
  CalendarDays,
  ShieldAlert,
  Info,
  Flame,
  MapPin
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Sub-navigation configuration based on primary sidebar path
function getSubTabs(pathname: string, role: string) {
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'staff';

  switch (pathname) {
    case '/':
      return [
        { id: 'feed', name: 'Community Feed' },
        { id: 'spotlights', name: 'Spotlights' }
      ];
    case '/directory':
      return [
        { id: 'grid', name: 'Registry Grid' },
        { id: 'skills', name: 'Skills Analysis' }
      ];
    case '/events':
      const eventTabs = [
        { id: 'calendar', name: 'Calendar Board' },
        { id: 'tickets', name: 'RSVP\'d Tickets' }
      ];
      if (isAdmin) {
        eventTabs.push({ id: 'schedule', name: 'Schedule Program' });
      }
      return eventTabs;
    case '/attendance':
      const attendTabs = [
        { id: 'tracker', name: 'My Attendance' }
      ];
      if (isAdmin) {
        attendTabs.push({ id: 'manual', name: 'Manual Registry' });
      }
      return attendTabs;
    case '/welfare':
      const welfareTabs = [
        { id: 'welfare', name: 'Welfare & Suggestions' },
        { id: 'complaint', name: 'Anonymous Complaint Box' }
      ];
      if (role === 'admin' || role === 'super_admin') {
        welfareTabs.push({ id: 'resolver', name: 'Resolver Desk' });
      }
      return welfareTabs;
    case '/reports':
      if (role === 'admin' || role === 'super_admin') {
        return [
          { id: 'charts', name: 'Metrics Charts' },
          { id: 'demographics', name: 'Demographics' },
          { id: 'export', name: 'Spreadsheet Registry' }
        ];
      }
      return [];
    case '/messages':
      return [
        { id: 'channels', name: 'Discussions' },
        { id: 'dms', name: 'Private DMs' }
      ];
    default:
      return [];
  }
}

// Mobile sub-tabs bar — sticky below the header on small screens
function MobileContextualNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser } = useApp();

  const subTabs = getSubTabs(pathname, currentUser.role);
  if (subTabs.length === 0) return null;

  const activeTabId = searchParams.get('tab') || subTabs[0].id;

  return (
    <div className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-30 overflow-x-auto">
      <nav className="flex gap-1 px-4 py-2 min-w-max">
        {subTabs.map((tab) => {
          const isTabActive = activeTabId === tab.id;
          return (
            <Link
              key={tab.id}
              href={`${pathname}?tab=${tab.id}`}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isTabActive
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-gray-500 hover:text-[#212120] hover:bg-gray-100'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Client Component to handle contextual sub-tabs using query parameters safely
function ContextualNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser } = useApp();

  const subTabs = getSubTabs(pathname, currentUser.role);
  if (subTabs.length === 0) return <div className="hidden md:block w-32"></div>;

  // Find active tab or fallback to the first one (default)
  const activeTabId = searchParams.get('tab') || subTabs[0].id;

  return (
    <nav className="hidden md:flex items-center gap-1.5 bg-gray-50 border border-gray-200/50 p-1 rounded-full">
      {subTabs.map((tab) => {
        const isTabActive = activeTabId === tab.id;
        return (
          <Link
            key={tab.id}
            href={`${pathname}?tab=${tab.id}`}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isTabActive
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-gray-500 hover:text-[#212120] hover:bg-gray-100'
              }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, profiles, posts, events, notifications, unreadCount, markAllRead, markRead, recordDailyCheckIn, getDailyCheckInStatus } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gridOpen, setGridOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // --- Global search results (members, events, posts) ---
  const q = searchQuery.trim().toLowerCase();
  const memberResults = q
    ? profiles.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q))
      ).slice(0, 5)
    : [];
  const eventResults = q
    ? events.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];
  const postResults = q
    ? posts.filter(p =>
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      ).slice(0, 4)
    : [];
  const totalResults = memberResults.length + eventResults.length + postResults.length;

  const go = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setGridOpen(false);
    setHelpOpen(false);
    router.push(href);
  };

  // Roles eligible for the daily geo check-in button
  const canDailyCheckIn = ['member', 'alumni', 'staff'].includes(currentUser.role);
  const checkInStatus = getDailyCheckInStatus(currentUser.id);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="w-4 h-4 text-brand-blue" />;
      case 'birthday': return <Gift className="w-4 h-4 text-pink-500" />;
      case 'event': return <CalendarDays className="w-4 h-4 text-orange-500" />;
      case 'welfare': return <ShieldAlert className="w-4 h-4 text-brand-green" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotifBg = (type: string, read: boolean) => {
    if (read) return 'bg-white';
    switch (type) {
      case 'message': return 'bg-brand-blue/5';
      case 'birthday': return 'bg-pink-50';
      case 'event': return 'bg-orange-50';
      case 'welfare': return 'bg-green-50';
      default: return 'bg-gray-50';
    }
  };

  const navigation = [
    { name: 'Feed', href: '/', icon: Home, roles: ['super_admin', 'admin', 'staff', 'member', 'alumni', 'partner'] },
    { name: 'Directory', href: '/directory', icon: Users, roles: ['super_admin', 'admin', 'staff', 'member', 'alumni', 'partner'] },
    { name: 'Events', href: '/events', icon: Calendar, roles: ['super_admin', 'admin', 'staff', 'member', 'alumni', 'partner'] },
    { name: 'My Attendance', href: '/attendance', icon: QrCode, roles: ['super_admin', 'admin', 'staff', 'member'] },
    { name: 'Messages', href: '/messages', icon: MessageSquare, roles: ['super_admin', 'admin', 'staff', 'member', 'alumni', 'partner'] },
    { name: 'Welfare', href: '/welfare', icon: HeartHandshake, roles: ['super_admin', 'admin', 'staff', 'member', 'alumni', 'partner'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['super_admin', 'admin'] }
  ];

  const visibleNav = navigation.filter(item => item.roles.includes(currentUser.role));

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

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans">

      {/* --- TOP NAVBAR (Contextual / Secondary layer) --- */}
      <header className="h-16 bg-white border-b border-[#E1E5EA] shadow-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shrink-0">

        {/* Left Section: Logo & Search */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white font-black shadow-sm">
              R
            </div>
            <span className="font-extrabold text-base text-[#212120] hidden sm:inline">
              <span className="text-[#177AE5]">RIL</span> Hub
            </span>
          </Link>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-1.5 rounded-full hover:bg-gray-100 shrink-0 border border-transparent hover:border-gray-200"
            title="Search the hub"
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline text-[10.5px] font-bold">Search...</span>
          </button>
        </div>

        {/* Middle Section: Dynamic Sub-Navigation Tabs */}
        <Suspense fallback={<div className="hidden md:block w-32 h-6 bg-gray-100 animate-pulse rounded-full"></div>}>
          <ContextualNavbar />
        </Suspense>

        {/* Right Section: Core Profile Utilities & Switcher */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* USER ROLE BADGE */}
          <div className="mr-2 hidden sm:block">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-blue/10 text-sky-blue border border-sky-blue/20">
              {getRoleName(currentUser.role)}
            </span>
          </div>

          {/* NOTIFICATION BELL */}
          <div className="relative">
            <button
              onClick={() => { setNotifPanelOpen(!notifPanelOpen); if (!notifPanelOpen) markAllRead(); }}
              className="relative w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifPanelOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {/* Panel Header */}
                <div className="px-4 py-3 bg-brand-black flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-sky-blue" />
                    <span className="text-xs font-bold text-white">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllRead}
                      className="text-[9px] font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={() => setNotifPanelOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-400 italic">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <Link
                        key={notif.id}
                        href={notif.link || '/'}
                        onClick={() => { markRead(notif.id); setNotifPanelOpen(false); }}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${getNotifBg(notif.type, notif.read)
                          }`}
                      >
                        {/* Icon or Avatar */}
                        <div className="shrink-0 mt-0.5">
                          {notif.avatar ? (
                            <Avatar src={notif.avatar} name={notif.title} size="sm" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {getNotifIcon(notif.type)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] leading-tight ${notif.read ? 'font-semibold text-gray-600' : 'font-bold text-gray-900'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                          <span className="text-[9px] text-gray-400 font-semibold mt-1 block">{notif.timestamp}</span>
                        </div>

                        {/* Unread dot */}
                        {!notif.read && (
                          <span className="w-2 h-2 bg-brand-blue rounded-full shrink-0 mt-1" />
                        )}
                      </Link>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center">
                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                    {notifications.length} total · Simulated real-time feed
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grid Button — app launcher */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => { setGridOpen(!gridOpen); setHelpOpen(false); }}
              className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center cursor-pointer shadow-sm shadow-brand-blue/10 hover:bg-brand-blue/90 transition-colors"
              title="Quick launcher"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            {gridOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl py-3 px-3 z-50">
                <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 px-1">Quick Launcher</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {visibleNav.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => go(item.href)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 hover:text-brand-blue"
                    >
                      <span className="w-9 h-9 rounded-xl bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-brand-blue" />
                      </span>
                      <span className="text-[9px] font-bold text-center leading-tight">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => { setHelpOpen(!helpOpen); setGridOpen(false); }}
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors"
              title="Help & tips"
            >
              <CircleHelp className="w-4.5 h-4.5" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-brand-black">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5"><CircleHelp className="w-4 h-4 text-sky-blue" /> RIL Hub — Help & Tips</p>
                </div>
                <div className="p-3 space-y-1 text-xs">
                  <p className="px-2 py-1.5 text-gray-600 font-medium leading-relaxed">
                    Welcome to the RIL Hub demo. Explore the feed, directory, events, attendance, and welfare tools.
                  </p>
                  <div className="bg-sky-blue/5 border border-sky-blue/15 rounded-lg p-2.5 text-[10.5px] text-gray-600 font-semibold leading-relaxed">
                    💡 Tip: use the <span className="text-sky-blue font-bold">role switcher</span> (top-left of this bar) to preview Member, Staff, and Admin views.
                  </div>
                  <button onClick={() => go('/welfare?tab=complaint')} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 font-semibold text-gray-700">Report an issue anonymously</button>
                  <button onClick={() => go('/attendance?tab=tracker')} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 font-semibold text-gray-700">How daily check-in works</button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Vertical Divider */}
          <span className="h-6 w-px bg-gray-200 hidden sm:block"></span>

          {/* Profile Dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-xs font-bold text-[#212120]">Profile</span>
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="sm"
                className="shrink-0"
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 block">Digital Passport</span>
                  <span className="text-[11px] font-bold text-brand-blue block mt-0.5">
                    {currentUser.points} Participation Points
                  </span>
                </div>
                <Link
                  href={`/profile/${currentUser.id}`}
                  onClick={() => setUserDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  View My Passport
                </Link>
                <Link
                  href="/welfare"
                  onClick={() => setUserDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Welfare Center
                </Link>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    router.push('/login');
                  }}
                  className="w-full text-left block px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* --- MOBILE SUB-TABS BAR --- */}
      <Suspense fallback={null}>
        <MobileContextualNav />
      </Suspense>

      {/* --- MOBILE DRAWER --- */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-60 bg-white h-full flex flex-col p-6 shadow-2xl relative animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-6 border-b border-gray-100">
              <span className="font-extrabold text-sm"><span className="text-brand-blue">RIL</span> Hub Drawer</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 gap-3 border ${isActive
                        ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                        : 'text-gray-500 border-transparent hover:text-[#212120] hover:bg-gray-50'
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT GRID --- */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0">

        {/* Left Sidebar Menu */}
        <aside className="hidden md:block w-60 shrink-0 self-start space-y-3">

          {/* ── Daily Geo Check-In Button ── */}
          {canDailyCheckIn && (
            <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
              checkInStatus.isLoading
                ? 'bg-gradient-to-br from-brand-blue/90 to-[#1060C8]/90 border-brand-blue/0'
                : checkInStatus.checkedInToday
                ? 'bg-gradient-to-br from-brand-green/5 to-teal-50 border-brand-green/20'
                : 'bg-gradient-to-br from-brand-blue to-[#1060C8] border-brand-blue/0 shadow-brand-blue/20'
            }`}>
              {/* Card inner */}
              <div className="p-4">
                {checkInStatus.isLoading ? (
                  /* ── Loading Skeleton ── */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-4 bg-white/30 rounded-full animate-pulse" />
                      <div className="w-3.5 h-3.5 bg-white/30 rounded animate-pulse" />
                    </div>
                    <div className="space-y-1.5 py-0.5">
                      <div className="w-32 h-3.5 bg-white/40 rounded animate-pulse" />
                      <div className="w-24 h-2.5 bg-white/25 rounded animate-pulse" />
                    </div>
                    <div className="w-full h-9 bg-white/30 rounded-xl animate-pulse" />
                  </div>
                ) : checkInStatus.checkedInToday ? (
                  /* ── Already checked in ── */
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider bg-brand-green/15 text-brand-green border border-brand-green/20">
                        <span className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                        Checked In Today
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-brand-green" />
                    </div>

                    <div className="flex items-center gap-2.5 mb-3">
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border-2 border-brand-green/30" />
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-900 leading-tight">{currentUser.name}</p>
                        <p className="text-[9.5px] text-gray-400 font-semibold">{checkInStatus.checkInTime && `Checked in · ${checkInStatus.checkInTime}`}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/70 rounded-lg px-2.5 py-2 text-center border border-brand-green/10">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="text-xs font-extrabold text-gray-900">{checkInStatus.streak}</span>
                        </div>
                        <p className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider">Streak</p>
                      </div>
                      <div className="flex-1 bg-white/70 rounded-lg px-2.5 py-2 text-center border border-brand-green/10">
                        <div className="flex items-center justify-center gap-0.5 mb-0.5">
                          <span className="text-xs font-extrabold text-gray-900">{checkInStatus.totalDays}</span>
                        </div>
                        <p className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider">Total Days</p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Not yet checked in ── */
                  <>
                    {/* Decorative shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent pointer-events-none rounded-2xl" />

                    <div className="flex items-center justify-between mb-3 relative">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        Hub Check-In
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-white/60" />
                    </div>

                    <p className="text-white font-extrabold text-[12px] leading-tight mb-1 relative">
                      Record today's attendance
                    </p>
                    <p className="text-white/60 text-[9.5px] font-semibold mb-4 relative">
                      Geolocation verified · +50 XP
                    </p>

                    <button
                      onClick={() => setCheckInModalOpen(true)}
                      className="relative w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-brand-blue text-[11px] font-extrabold shadow-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      Check In for Today
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Primary Navigation Card ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-1">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`w-full flex items-center px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 gap-3 border ${
                    isActive
                      ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/10'
                      : 'text-gray-500 border-transparent hover:text-[#212120] hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content Wrapper */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>

      {/* ── Daily Check-In Modal ── */}
      <DailyCheckInModal
        open={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        currentUser={currentUser}
        onCheckInSuccess={recordDailyCheckIn}
        getDailyCheckInStatus={getDailyCheckInStatus}
      />

      {/* ── Global Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                placeholder="Search members, events, posts, skills..."
                className="flex-1 bg-transparent border-none text-sm text-brand-black focus:ring-0 focus:outline-none font-medium placeholder-gray-400"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {!q ? (
                <div className="py-12 text-center text-xs text-gray-400 font-semibold">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Start typing to search across the hub
                </div>
              ) : totalResults === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 font-semibold">
                  No results for “{searchQuery}”
                </div>
              ) : (
                <div className="py-2">
                  {memberResults.length > 0 && (
                    <div className="px-2 pb-2">
                      <span className="px-3 text-[9px] uppercase font-bold tracking-widest text-gray-400">Members</span>
                      {memberResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => go(`/directory?profile=${p.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <Avatar src={p.avatar} name={p.name} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-semibold truncate">{p.department} · {p.skills.slice(0, 2).join(', ')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {eventResults.length > 0 && (
                    <div className="px-2 pb-2 border-t border-gray-50 pt-2">
                      <span className="px-3 text-[9px] uppercase font-bold tracking-widest text-gray-400">Events</span>
                      {eventResults.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => go('/events?tab=calendar')}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4 text-orange-500" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{ev.title}</p>
                            <p className="text-[10px] text-gray-400 font-semibold truncate">{ev.date} · {ev.location}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {postResults.length > 0 && (
                    <div className="px-2 pb-2 border-t border-gray-50 pt-2">
                      <span className="px-3 text-[9px] uppercase font-bold tracking-widest text-gray-400">Feed Posts</span>
                      {postResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => go('/')}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="w-8 h-8 rounded-lg bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4 text-brand-blue" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.authorName}</p>
                            <p className="text-[10px] text-gray-400 font-semibold truncate">{p.content}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center">
              <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                {q ? `${totalResults} result${totalResults === 1 ? '' : 's'}` : 'Press Esc to close'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-5 px-4 md:px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] font-semibold text-gray-400">
          <span>© {new Date().getFullYear()} RIL Family Community. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-600 transition-all">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 transition-all">Terms of Service</a>
            <a href="#" className="hover:text-gray-600 transition-all">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
