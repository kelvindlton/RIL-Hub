'use client';

import { use, useEffect, Suspense } from 'react';
import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Award,
  Flame,
  Zap,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Code,
  Sparkles,
  MapPin,
  Calendar,
  Star,
  Send,
  CheckCircle
} from 'lucide-react';

const CONFETTI_COLORS = [
  '#177AE5', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#ec4899', '#f97316', '#84cc16',
];

function useConfetti(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    document.body.appendChild(canvas);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    const total = 160;
    const duration = 4000;

    type Piece = {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; angle: number; spin: number;
      color: string; shape: 'rect' | 'circle';
    };

    const pieces: Piece[] = Array.from({ length: total }, () => ({
      x: Math.random() * canvas.width,
      y: -(Math.random() * canvas.height * 0.5),
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.25,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    let animId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed > duration) {
        canvas.remove();
        window.removeEventListener('resize', resize);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = elapsed > duration * 0.65
        ? 1 - (elapsed - duration * 0.65) / (duration * 0.35)
        : 1;

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.vy += 0.05; // gravity
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 3 + 2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, [active]);
}

function ProfileContent({ id }: { id: string }) {
  const { profiles, posts, currentUser, likePost, bookmarkPost } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const celebrate = searchParams.get('celebrate') === 'true';

  useConfetti(celebrate);

  const profile = profiles.find((p) => p.id === id);
  const isOwnProfile = currentUser.id === id;
  const userPosts = posts.filter((p) => p.authorId === id);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700 border border-red-200';
      case 'admin': return 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20';
      case 'staff': return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'alumni': return 'bg-gray-100 text-gray-700 border border-gray-200';
      case 'partner': return 'bg-purple-100 text-purple-700 border border-purple-200';
      default: return 'bg-brand-green/10 text-brand-green border border-brand-green/20';
    }
  };

  const getRoleName = (role: string) => {
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleTagline = (role: string, dept: string) => {
    switch (role) {
      case 'admin': return `Hub Coordinator · ${dept}`;
      case 'super_admin': return `Super Administrator · ${dept}`;
      case 'staff': return `Lab Specialist · ${dept}`;
      case 'alumni': return `RIL Alumni · ${dept}`;
      case 'partner': return `Industry Partner · ${dept}`;
      default: return `Programme Member · ${dept}`;
    }
  };

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900">Profile Not Found</h2>
          <p className="text-xs text-gray-500 mt-1 mb-6">This member doesn't exist or has been removed.</p>
          <Link
            href="/directory"
            className="flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-blue transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Link>

        {/* Birthday banner */}
        {celebrate && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-md animate-in fade-in duration-300">
            <span className="text-2xl">🎂</span>
            <div>
              <p className="text-sm font-extrabold text-white leading-tight">
                Happy Birthday, {profile.name.split(' ')[0]}! 🎉
              </p>
              <p className="text-[10.5px] text-white/80 font-semibold mt-0.5">
                The RIL family wishes you an incredible day!
              </p>
            </div>
          </div>
        )}

        {/* ── Profile Hero Card ── */}
        <div className="bg-brand-black rounded-2xl overflow-hidden shadow-lg relative">

          {/* Banner gradient */}
          <div className="h-28 sm:h-36 bg-gradient-to-br from-brand-blue via-[#1258A3] to-brand-black relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-12 gap-4 p-4 h-full">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-white" />
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-4 opacity-5">
              <Award className="w-32 h-32 text-white" />
            </div>
          </div>

          {/* Avatar row */}
          <div className="px-5 sm:px-8 pb-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">

              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-brand-black bg-white shadow-xl object-cover"
                />
                {profile.streak > 0 && (
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500 border-2 border-brand-black flex items-center justify-center shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-white fill-white/30" />
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:mb-1">
                {isOwnProfile ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-blue bg-sky-blue/10 border border-sky-blue/20 px-3 py-1.5 rounded-full">
                    <Star className="w-3 h-3" />
                    Your Profile
                  </span>
                ) : (
                  <Link
                    href={`/messages?tab=dms`}
                    className="flex items-center gap-1.5 bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send DM
                  </Link>
                )}
              </div>
            </div>

            {/* Name + meta */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-none">{profile.name}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(profile.role)}`}>
                  {getRoleName(profile.role)}
                </span>
              </div>
              <p className="text-sky-blue text-xs font-semibold">{getRoleTagline(profile.role, profile.department)}</p>
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-semibold text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Joined {profile.joinedDate}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {profile.programCohort}
                </span>
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Hub Points', value: profile.points, icon: <Zap className="w-4 h-4 text-brand-blue" />, color: 'text-brand-blue' },
                { label: 'Day Streak', value: profile.streak, icon: <Flame className="w-4 h-4 text-orange-500" />, color: 'text-orange-500' },
                { label: 'Badges', value: profile.badges.length, icon: <Award className="w-4 h-4 text-yellow-500" />, color: 'text-yellow-500' },
                { label: 'Skills', value: profile.skills.length, icon: <Code className="w-4 h-4 text-brand-green" />, color: 'text-brand-green' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    {stat.icon}
                  </span>
                  <div>
                    <p className={`text-sm font-extrabold leading-none ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9.5px] text-gray-400 font-semibold mt-0.5 leading-none">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Main content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Core Skills */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Code className="w-4 h-4 text-brand-blue shrink-0" />
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Core Skills</h3>
                <span className="ml-auto bg-brand-blue/10 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {profile.skills.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 hover:bg-brand-blue/5 hover:text-brand-blue hover:border-brand-blue/20 transition-colors cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Interests</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-brand-blue/5 text-brand-blue text-xs font-bold px-3 py-1.5 rounded-full border border-brand-blue/15"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {userPosts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-blue shrink-0" />
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Recent Activity</h3>
                  <span className="ml-auto text-[10px] text-gray-400 font-semibold">{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span>
                </div>

                {userPosts.map((post) => {
                  const isLiked = post.likedBy.includes(currentUser.id);
                  const isBookmarked = post.bookmarkedBy.includes(currentUser.id);
                  return (
                    <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full border border-gray-200 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-gray-900">{post.authorName}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block">{post.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">{post.content}</p>
                      {post.image && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 max-h-56">
                          <img src={post.image} alt="Post" className="w-full object-cover" />
                        </div>
                      )}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <span key={tag} className="bg-brand-blue/5 text-brand-blue text-[9.5px] font-black px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 flex items-center gap-5 text-gray-400">
                        <button
                          onClick={() => likePost(post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-black hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : ''}`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1.5 text-[11px] font-black hover:text-brand-blue transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments.length}
                        </button>
                        <button
                          onClick={() => bookmarkPost(post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-black hover:text-sky-blue transition-colors ${isBookmarked ? 'text-sky-blue' : ''}`}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-sky-blue' : ''}`} />
                          {isBookmarked ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {userPosts.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-brand-blue" />
                <p className="text-xs font-semibold">No community posts yet from {profile.name.split(' ')[0]}.</p>
              </div>
            )}
          </div>

          {/* ── Right: Passport Sidebar ── */}
          <div className="space-y-5">

            {/* Digital Passport Contact Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-brand-black px-5 py-3.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-blue">Digital Passport</span>
                <span className="ml-auto text-[9px] font-semibold text-gray-500">ID: {profile.id}</span>
              </div>
              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="font-semibold truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="font-semibold">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Department</span>
                    <span className="font-bold text-gray-800">{profile.department}</span>
                  </div>
                </div>
              </div>

              {/* Attendance stats */}
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-extrabold text-orange-500">{profile.streak}</span>
                    </div>
                    <p className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wide">Day Streak</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Zap className="w-3.5 h-3.5 text-brand-blue" />
                      <span className="text-sm font-extrabold text-brand-blue">{profile.points}</span>
                    </div>
                    <p className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wide">Hub Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Badges */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Award className="w-4 h-4 text-yellow-500 shrink-0" />
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Digital Badges</h3>
                <span className="ml-auto bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                  {profile.badges.length} earned
                </span>
              </div>
              {profile.badges.length > 0 ? (
                <div className="space-y-2">
                  {profile.badges.map((badge) => (
                    <div key={badge} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-brand-blue/3 border border-brand-blue/8 hover:bg-brand-blue/5 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5 text-brand-blue" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">{badge}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-brand-green ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center py-3">No badges earned yet.</p>
              )}
            </div>

            {/* Member Since card */}
            <div className="bg-gradient-to-br from-brand-blue to-[#1258A3] rounded-2xl p-5 text-white shadow-md">
              <span className="text-[9px] uppercase font-bold tracking-widest text-sky-blue/80 block">Renaissance Innovation Labs</span>
              <p className="text-sm font-extrabold mt-1">Member since {profile.joinedDate}</p>
              <p className="text-[10.5px] text-white/60 font-semibold mt-1 leading-relaxed">
                Building the future of tech in Port Harcourt and beyond.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <img src={profile.avatar} alt={profile.name} className="w-7 h-7 rounded-full border-2 border-white/30 shrink-0" />
                <span className="text-[10.5px] font-bold text-white/80">{profile.programCohort}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs text-gray-500 font-semibold">
        Loading profile...
      </div>
    }>
      <ProfileContent id={id} />
    </Suspense>
  );
}
