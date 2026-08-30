'use client';

import { use, useEffect, useState, Suspense } from 'react';
import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { ProfileSkeleton } from '@/components/common/Skeletons';
import PostImageViewerModal from '@/components/common/PostImageViewerModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
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
  CheckCircle,
  Pencil,
  User,
  GitBranch,
  Globe
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
        p.vy += 0.05;
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
  const { profiles, posts, currentUser, isUserLoading, isLoading, isError, errorMessage, refetchData, likePost, bookmarkPost, updateOwnProfile, uploadOwnAvatar } = useApp();
  const searchParams = useSearchParams();
  const celebrate = searchParams.get('celebrate') === 'true';
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Post attachments, same pattern as the community feed: failedImages so a
  // broken image takes its clickable wrapper with it rather than leaving a dead
  // clickable gap, viewerImage = the src currently open in the lightbox.
  const [failedImages, setFailedImages] = useState<{ [postId: string]: boolean }>({});
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useConfetti(celebrate);

  const profile = profiles.find((p) => p.id === id);
  // Not trustworthy until auth resolves: currentUser is seeded with a mock profile
  // (AppContext initialProfiles[0]) for first paint, so this would read false on a
  // fresh load of your OWN profile and flash the "Send DM" button.
  const isOwnProfile = !isUserLoading && currentUser.id === id;
  // Messaging is admin-only until /messages ships — see src/lib/requireAdmin.ts.
  const isAdmin = !isUserLoading && ['super_admin', 'admin'].includes(currentUser.role);
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

  // Fallback only — used when a member hasn't written their own headline yet.
  const getRoleTagline = (role: string, dept?: string) => {
    const department = dept || 'General Cohort';
    switch (role) {
      case 'admin': return `Hub Coordinator · ${department}`;
      case 'super_admin': return `Super Administrator · ${department}`;
      case 'staff': return `Lab Specialist · ${department}`;
      case 'alumni': return `RIL Alumni · ${department}`;
      case 'partner': return `Industry Partner · ${department}`;
      default: return `Programme Member · ${department}`;
    }
  };

  if (isLoading && profiles.length === 0) {
    return (
      <DashboardLayout>
        <ProfileSkeleton />
      </DashboardLayout>
    );
  }

  if (isError && profiles.length === 0) {
    return (
      <DashboardLayout>
        <ErrorState
          title="Could not load member profile"
          message={errorMessage || 'Failed to retrieve profile data from Supabase.'}
          onRetry={refetchData}
        />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="py-12">
          <EmptyState
            icon={Award}
            title="Profile Not Found"
            description="This member profile doesn't exist or has been removed from the directory."
            actionLabel="Back to Directory"
            actionHref="/directory"
          />
        </div>
      </DashboardLayout>
    );
  }

  // The DB CHECKs constrain these to http(s), but re-validate before emitting an
  // href: a link is rendered only if it passes here too, so a value predating the
  // constraint (or arriving by some other path) can never become a javascript: href.
  const safeUrl = (url?: string) => (url && /^https?:\/\//i.test(url) ? url : null);
  // lucide-react 1.x dropped brand glyphs (no Linkedin/Github export), so these use
  // the closest generic icons — the visible label carries the identification.
  const socialLinks = [
    { label: 'LinkedIn', url: safeUrl(profile.linkedinUrl), icon: Briefcase },
    { label: 'GitHub', url: safeUrl(profile.githubUrl), icon: GitBranch },
    { label: 'Website', url: safeUrl(profile.websiteUrl), icon: Globe },
  ].filter((link) => link.url);

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
                <Avatar
                  src={profile.avatar}
                  name={profile.name}
                  size="2xl"
                  className="border-4 border-brand-black shadow-xl"
                  viewable
                  editable={isOwnProfile}
                />
                {profile.streak > 0 && (
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500 border-2 border-brand-black flex items-center justify-center shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-white fill-white/30" />
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:mb-1">
                {isUserLoading ? (
                  // Auth unresolved — neither branch below is trustworthy yet. Sized to
                  // the Send DM button's footprint so resolving causes no layout shift.
                  <span
                    className="inline-block w-28 h-8 bg-white/20 animate-pulse rounded-xl"
                    aria-hidden="true"
                  />
                ) : isOwnProfile ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-blue bg-sky-blue/10 border border-sky-blue/20 px-3 py-1.5 rounded-full">
                      <Star className="w-3 h-3" />
                      Your Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="flex items-center gap-1.5 bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Profile
                    </button>
                  </>
                ) : isAdmin ? (
                  <Link
                    href={`/messages?tab=dms&user=${profile.id}`}
                    className="flex items-center gap-1.5 bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send DM
                  </Link>
                ) : null}
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
              <p className="text-sky-blue text-xs font-semibold">
                {profile.headline || getRoleTagline(profile.role, profile.department)}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-semibold text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Joined {profile.joinedDate || 'Recently'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {profile.programCohort || 'Renaissance Labs'}
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

            {/* About — bio + social links; hidden entirely when the member has neither */}
            {(profile.bio || socialLinks.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <User className="w-4 h-4 text-brand-blue shrink-0" />
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">About</h3>
                </div>
                {profile.bio && (
                  <p className="text-xs text-gray-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {profile.bio}
                  </p>
                )}
                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-brand-blue/5 text-gray-700 hover:text-brand-blue text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 hover:border-brand-blue/20 transition-colors"
                      >
                        <link.icon className="w-3.5 h-3.5" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Core Skills */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Code className="w-4 h-4 text-brand-blue shrink-0" />
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Core Skills</h3>
                <span className="ml-auto bg-brand-blue/10 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {profile.skills.length}
                </span>
              </div>
              {profile.skills.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No technical skills listed yet.</p>
              ) : (
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
              )}
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

            {/* Activity Feed / Posts by User */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">
                  Recent Contributions ({userPosts.length})
                </h3>
              </div>

              {userPosts.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No posts published yet"
                  description={`${profile.name} hasn't published any community feed posts yet.`}
                />
              ) : (
                userPosts.map((post) => {
                  // null once a load fails, so the clickable wrapper disappears
                  // with the image instead of lingering as an invisible target.
                  const postImage = post.image && !failedImages[post.id] ? post.image : null;

                  return (
                    <div key={post.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={post.authorAvatar} name={post.authorName} size="sm" viewable />
                        <div>
                          <span className="text-xs font-bold text-gray-900">{post.authorName}</span>
                          <span className="text-[10px] text-gray-400 block">{post.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap break-words">{post.content}</p>

                      {postImage && (
                        <button
                          type="button"
                          onClick={() => setViewerImage(postImage)}
                          className="block w-full rounded-xl overflow-hidden border border-gray-200 max-h-80 bg-gray-50 cursor-zoom-in"
                          aria-label="View image full size"
                        >
                          <img
                            src={postImage}
                            alt="Post attachment"
                            className="w-full h-full object-cover"
                            onError={() => setFailedImages(prev => ({ ...prev, [post.id]: true }))}
                          />
                        </button>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <button onClick={() => likePost(post.id)} className="flex items-center gap-1 hover:text-red-500 font-bold">
                          <Heart className="w-3.5 h-3.5" />
                          <span>{post.likes}</span>
                        </button>
                        <span className="flex items-center gap-1 font-bold">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{post.comments.length}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* ── Right: Meta card & Digital Badges ── */}
          <div className="space-y-6">

            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">Contact Information</h3>
              </div>
              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="font-semibold truncate">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="font-semibold">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Department</span>
                    <span className="font-bold text-gray-800">{profile.department || 'General Cohort'}</span>
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
              <p className="text-sm font-extrabold mt-1">Member since {profile.joinedDate || '2025'}</p>
              <p className="text-[10.5px] text-white/70 font-semibold mt-1 leading-relaxed">
                Building the future of tech in Port Harcourt and beyond.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Avatar src={profile.avatar} name={profile.name} size="xs" className="border border-white/30" viewable />
                <span className="text-[10.5px] font-bold text-white/90">{profile.programCohort}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mounted only while open so each open reseeds from the saved profile */}
      {isOwnProfile && isEditOpen && (
        <EditProfileModal
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          onSubmit={updateOwnProfile}
          onUploadAvatar={uploadOwnAvatar}
        />
      )}

      {/* View-only lightbox for post attachments — shared with the community feed */}
      {viewerImage && (
        <PostImageViewerModal src={viewerImage} onClose={() => setViewerImage(null)} />
      )}
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
