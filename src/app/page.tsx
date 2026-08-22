'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { PostSkeleton, TrendingWidgetSkeleton, CelebrationsWidgetSkeleton, HubEngagementSkeleton, SpotlightSkeleton } from '@/components/common/Skeletons';
import SpotlightCard from '@/components/spotlights/SpotlightCard';
import CreateSpotlightModal from '@/components/spotlights/CreateSpotlightModal';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Image as ImageIcon,
  Smile,
  Tag,
  Megaphone,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Cake,
  Award,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

function DashboardContent() {
  const {
    currentUser,
    profiles,
    posts,
    events,
    spotlights,
    isLoading,
    isError,
    errorMessage,
    refetchData,
    addPost,
    likePost,
    bookmarkPost,
    addComment,
    addSpotlight,
    rewardUser,
    hubEngagement,
  } = useApp();

  // Role authorization: only Admin and Staff can create and manage spotlight honors
  const canManageSpotlights = ['super_admin', 'admin', 'staff'].includes(currentUser?.role);
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);

  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'feed';

  // Derive upcoming birthdays from member profiles (today + soonest ahead, wrapping the year)
  const upcomingBirthdays = React.useMemo(() => {
    const now = new Date();
    const todayKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayOfYear = (mmdd: string) => {
      const [m, d] = mmdd.split('-').map(Number);
      return new Date(now.getFullYear(), m - 1, d).getTime();
    };
    const todayMs = dayOfYear(todayKey);
    const YEAR_MS = 365 * 86_400_000;

    return profiles
      .filter(p => p.birthday)
      .map(p => {
        let diff = dayOfYear(p.birthday!) - todayMs;
        if (diff < 0) diff += YEAR_MS; // wrap into next year
        return { profile: p, diff, isToday: p.birthday === todayKey };
      })
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);
  }, [profiles]);

  const birthdayLabel = (entry: { diff: number; isToday: boolean }) => {
    if (entry.isToday) return 'Today is their birthday! 🎉';
    const days = Math.round(entry.diff / 86_400_000);
    if (days === 1) return 'Birthday tomorrow';
    return `Birthday in ${days} days`;
  };

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<{ [postId: string]: boolean }>({});
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Hub Engagement (trailing 7 days, bucketed by real weekday) ─────────────
  // hubEngagement is provided by AppContext (SECURITY DEFINER RPC, aggregate
  // counts only). null = still loading; [] = loaded but no activity yet.
  // Bars are keyed on UTC dates to match the check-in system, and "Today" is the
  // last bar in its true weekday position (not a fixed slot).
  const engagementBars = React.useMemo(() => {
    if (hubEngagement === null) return null;
    const counts = new Map(hubEngagement.map(d => [d.date, d.count]));
    const todayKey = new Date().toISOString().split('T')[0];
    const bars: { key: string; label: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(`${todayKey}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().split('T')[0];
      bars.push({
        key,
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        count: counts.get(key) ?? 0,
        isToday: i === 0,
      });
    }
    return bars;
  }, [hubEngagement]);

  const engagementMax = engagementBars ? Math.max(0, ...engagementBars.map(b => b.count)) : 0;
  const engagementEmpty = engagementBars !== null && engagementMax === 0;

  const filteredPosts = activeHashtag
    ? posts.filter(p => p.tags.some(t => t.toLowerCase() === activeHashtag.toLowerCase()))
    : posts;

  const handleHashtagClick = (tag: string) => {
    const clean = tag.replace(/^#/, '');
    setActiveHashtag(prev => prev?.toLowerCase() === clean.toLowerCase() ? null : clean);
  };

  // Derive trending topics from recent posts (7-day recency window -> 30-day fallback)
  // Tags with missing/null createdAt are strictly excluded from recency calculation
  const trendingTopics = React.useMemo(() => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 86_400_000;
    const THIRTY_DAYS_MS = 30 * 86_400_000;

    const computeTags = (postList: typeof posts) => {
      const tagMap: Record<string, { displayTag: string; count: number }> = {};
      postList.forEach((post) => {
        (post.tags || []).forEach((rawTag) => {
          const clean = rawTag.trim().replace(/^#/, '');
          if (!clean) return;
          const lowerKey = clean.toLowerCase();
          if (!tagMap[lowerKey]) {
            // Preserve the original casing as first typed by the user (e.g. "AgriTech")
            tagMap[lowerKey] = { displayTag: clean, count: 0 };
          }
          tagMap[lowerKey].count += 1;
        });
      });

      return Object.values(tagMap)
        .map((item) => ({
          tag: `#${item.displayTag}`,
          count: item.count,
          label: item.count === 1 ? '1 post' : `${item.count} posts`,
        }))
        .sort((a, b) => b.count - a.count);
    };

    // Tier 1: Strict 7-day window (posts with missing createdAt are excluded)
    const recentPosts7d = posts.filter((p) => {
      if (!p.createdAt) return false;
      const postTime = new Date(p.createdAt).getTime();
      return !isNaN(postTime) && now - postTime <= SEVEN_DAYS_MS;
    });

    let results = computeTags(recentPosts7d);

    // Tier 2: If fewer than 3 topics in 7 days, expand to 30-day window
    if (results.length < 3) {
      const recentPosts30d = posts.filter((p) => {
        if (!p.createdAt) return false;
        const postTime = new Date(p.createdAt).getTime();
        return !isNaN(postTime) && now - postTime <= THIRTY_DAYS_MS;
      });
      const results30d = computeTags(recentPosts30d);
      if (results30d.length > results.length) {
        results = results30d;
      }
    }

    // Tier 3: If still empty but posts exist, fallback to all available posts
    if (results.length === 0 && posts.length > 0) {
      results = computeTags(posts);
    }

    return results;
  }, [posts]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const copyPostLink = (postId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#${postId}`);
    }
  };

  const EMOJIS = ['🚀', '🎉', '🔥', '💡', '🤖', '🌱', '💙', '👏', '✅', '🛠️'];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewPostImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);

    if (!newPostContent.trim() && !newPostImage) {
      setComposerError('Please enter some text or attach an image to share a post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = newPostTags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await addPost(newPostContent, tagsArray, newPostImage || undefined);
      setNewPostContent('');
      setNewPostTags('');
      setNewPostImage(null);
      showToast('Post shared with the community!');
    } catch (err: any) {
      setComposerError(err?.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT / MAIN FEED COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">

          {tab === 'feed' ? (
            <>
              {/* Post Creation Box */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex gap-3">
                  <Avatar
                    src={currentUser.avatar}
                    name={currentUser.name}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <textarea
                      id="post-composer-input"
                      rows={3}
                      value={newPostContent}
                      onChange={(e) => {
                        setNewPostContent(e.target.value);
                        if (composerError) setComposerError(null);
                      }}
                      placeholder={`What's on your mind today, ${currentUser.name.split(' ')[0]}?`}
                      className="w-full text-sm border-0 focus:ring-0 focus:outline-none p-1 placeholder-gray-400 resize-none font-medium text-gray-800"
                    />

                    {composerError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium py-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{composerError}</span>
                      </div>
                    )}

                    {/* Attached Image Preview */}
                    {newPostImage && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 max-h-56 bg-gray-50">
                        <img
                          src={newPostImage}
                          alt="Upload preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPostImage(null)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 text-xs leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Emoji Quick Picker */}
                    {showEmoji && (
                      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewPostContent(prev => prev + emoji);
                              setShowEmoji(false);
                            }}
                            className="text-lg hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-blue font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-brand-blue" />
                      <span>Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEmoji(prev => !prev)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-blue font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Smile className="w-4 h-4 text-amber-500" />
                      <span>Emoji</span>
                    </button>

                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={newPostTags}
                        onChange={(e) => setNewPostTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                        className="bg-transparent border-0 text-xs text-gray-700 placeholder-gray-400 focus:outline-none p-0 w-36"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePostSubmit}
                    disabled={isSubmitting || (!newPostContent.trim() && !newPostImage)}
                    className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm shadow-brand-blue/20 active:scale-95 flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </div>

              {/* Active Filter Indicator */}
              {activeHashtag && (
                <div className="flex items-center justify-between bg-brand-blue/5 border border-brand-blue/20 rounded-xl px-4 py-2 text-xs">
                  <span className="font-semibold text-gray-700">
                    Filtered by tag: <span className="font-bold text-brand-blue">#{activeHashtag}</span>
                  </span>
                  <button
                    onClick={() => setActiveHashtag(null)}
                    className="font-bold text-brand-blue hover:underline"
                  >
                    Clear Filter ✕
                  </button>
                </div>
              )}

              {/* Feed Posts / Skeletons / Empty State */}
              <div className="space-y-6">
                {isLoading && posts.length === 0 ? (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                ) : isError && posts.length === 0 ? (
                  <ErrorState
                    title="Could not load feed"
                    message={errorMessage || 'We experienced an error connecting to Supabase. Check your connection or retry.'}
                    onRetry={refetchData}
                  />
                ) : filteredPosts.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title={activeHashtag ? "No tagged posts found" : "No community posts yet"}
                    description={
                      activeHashtag
                        ? `No posts have been tagged with #${activeHashtag} yet. Explore other topics or clear the filter.`
                        : "Be the first to share an update, announce a milestone, or start a discussion with the RIL community."
                    }
                    actionLabel={activeHashtag ? "Clear Tag Filter" : "Create First Post"}
                    onAction={activeHashtag ? () => setActiveHashtag(null) : () => document.getElementById('post-composer-input')?.focus()}
                  />
                ) : (
                  filteredPosts.map((post) => {
                    const isLiked = post.likedBy.includes(currentUser.id);
                    const isBookmarked = post.bookmarkedBy.includes(currentUser.id);
                    const isCommentsOpen = activeCommentsPostId === post.id;
                    const isExpanded = !!expandedPosts[post.id];
                    const isLongContent = post.content.length > 320;

                    return (
                      <div
                        key={post.id}
                        className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 relative transition-all ${
                          post.isPinned ? 'border-brand-blue/30 ring-1 ring-brand-blue/10' : 'border-gray-200'
                        }`}
                      >
                        {post.isPinned && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-brand-blue mb-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Pinned Announcement</span>
                          </div>
                        )}

                        {/* Feed Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={post.authorAvatar}
                              name={post.authorName}
                              size="md"
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-gray-900 truncate hover:underline cursor-pointer">
                                  {post.authorName}
                                </span>
                                <span className="text-gray-400 text-xs">•</span>
                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                                  {post.authorRole}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-semibold block">{post.timestamp}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-50"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuPostId === post.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenMenuPostId(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 text-xs font-semibold">
                                  <button
                                    onClick={() => { copyPostLink(post.id); setOpenMenuPostId(null); showToast('Link copied to clipboard'); }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                                  >
                                    Copy link
                                  </button>
                                  <button
                                    onClick={() => { bookmarkPost(post.id); setOpenMenuPostId(null); showToast('Saved to bookmarks'); }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                                  >
                                    Save post
                                  </button>
                                  <button
                                    onClick={() => { setOpenMenuPostId(null); showToast('Post reported to moderators'); }}
                                    className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                                  >
                                    Report post
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Feed Content */}
                        <div className="space-y-3">
                          <p className="text-xs text-gray-700 leading-relaxed font-medium whitespace-pre-wrap break-words">
                            {isLongContent && !isExpanded
                              ? `${post.content.slice(0, 320)}...`
                              : post.content}
                          </p>

                          {isLongContent && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(post.id)}
                              className="text-[11px] font-bold text-brand-blue hover:underline block -mt-1"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                          
                          {post.image && (
                            <div className="rounded-xl overflow-hidden border border-gray-200 max-h-80 bg-gray-50">
                              <img
                                src={post.image}
                                alt="Post attachment"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Gracefully hide broken post images
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  onClick={() => handleHashtagClick(tag)}
                                  className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                                    activeHashtag?.toLowerCase() === tag.toLowerCase()
                                      ? 'bg-brand-blue text-white'
                                      : 'bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10'
                                  }`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Feed Actions bar */}
                        <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between text-gray-500">
                          <button
                            onClick={() => likePost(post.id)}
                            className={`flex items-center gap-1.5 text-xs font-bold hover:text-red-500 transition-colors ${
                              isLiked ? 'text-red-500' : ''
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span>{post.likes}</span>
                          </button>

                          <button
                            onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                            className={`flex items-center gap-1.5 text-xs font-bold hover:text-brand-blue transition-colors ${
                              isCommentsOpen ? 'text-brand-blue' : ''
                            }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.comments.length}</span>
                          </button>

                          <button
                            onClick={() => bookmarkPost(post.id)}
                            className={`flex items-center gap-1.5 text-xs font-bold hover:text-sky-blue transition-colors ${
                              isBookmarked ? 'text-sky-blue' : ''
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-sky-blue text-sky-blue' : ''}`} />
                            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                          </button>

                          <button
                            onClick={() => {
                              copyPostLink(post.id);
                              rewardUser(currentUser.id, 2);
                              showToast('Link copied to clipboard · +2 XP');
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold hover:text-brand-green transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                        </div>

                        {/* Comment section drawer */}
                        {isCommentsOpen && (
                          <div className="border-t border-gray-100 pt-4 space-y-3 animate-in fade-in duration-150">
                            {post.comments.length === 0 ? (
                              <p className="text-xs text-gray-400 italic py-1">No comments yet. Be the first to reply!</p>
                            ) : (
                              post.comments.map((c) => (
                                <div key={c.id} className="flex gap-2.5 items-start bg-gray-50/70 p-2.5 rounded-xl">
                                  <Avatar
                                    src={c.authorAvatar}
                                    name={c.authorName}
                                    size="xs"
                                    className="shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-gray-900 truncate">{c.authorName}</span>
                                      <span className="text-[9px] text-gray-400">{c.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-0.5 break-words">{c.content}</p>
                                  </div>
                                </div>
                              ))
                            )}

                            {/* Add comment input */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const text = commentInputs[post.id];
                                if (!text || !text.trim()) return;
                                addComment(post.id, text.trim());
                                setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
                              }}
                              className="flex gap-2 pt-1"
                            >
                              <Avatar
                                src={currentUser.avatar}
                                name={currentUser.name}
                                size="xs"
                                className="shrink-0 mt-1"
                              />
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  placeholder="Write a comment..."
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-blue"
                                />
                                <button
                                  type="submit"
                                  disabled={!commentInputs[post.id]?.trim()}
                                  className="text-brand-blue disabled:opacity-40 font-bold text-xs px-2"
                                >
                                  Send
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* --- SPOTLIGHTS VIEW --- */
            /**
             * NOTE ON ARCHITECTURE:
             * This follows Option A (Admin/Staff Curated Honors) where leadership
             * handpicks community members and publishes custom achievement writeups.
             * Option B (automated rankings derived from points_ledger / daily check-in streaks)
             * is a planned future addition once platform activity reaches critical volume.
             */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Renaissance Spotlight Honors</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    We celebrate outstanding community contributions, leadership milestones, and tech innovations across the Hubs.
                  </p>
                </div>
                {canManageSpotlights && (
                  <button
                    onClick={() => setShowSpotlightModal(true)}
                    className="bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-brand-blue/20 shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Feature a Member
                  </button>
                )}
              </div>

              {isLoading && spotlights.length === 0 ? (
                <div className="space-y-6">
                  <SpotlightSkeleton />
                  <SpotlightSkeleton />
                </div>
              ) : spotlights.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No Member Spotlights Yet"
                  description="Spotlight honors celebrate exceptional project builds, open-source work, and community leadership."
                  actionLabel={canManageSpotlights ? "Feature a Member" : undefined}
                  onAction={canManageSpotlights ? () => setShowSpotlightModal(true) : undefined}
                />
              ) : (
                <div className="space-y-6">
                  {spotlights.map((spotlight) => (
                    <SpotlightCard key={spotlight.id} spotlight={spotlight} />
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

        {/* --- RIGHT COLUMN: SIDEBAR WIDGETS --- */}
        <div className="space-y-6">
          
          {/* Trending Widget */}
          {isLoading && posts.length === 0 ? (
            <TrendingWidgetSkeleton />
          ) : trendingTopics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest">
                  Trending
                </h4>
                <TrendingUp className="w-4 h-4 text-brand-blue shrink-0" />
              </div>
              <div className="py-2 text-center space-y-1">
                <p className="text-[11px] font-bold text-gray-500">Not enough activity yet</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                  Trends will appear here as members use hashtags like <span className="text-brand-blue font-semibold">#ai</span> or <span className="text-brand-blue font-semibold">#hardware</span>.
                </p>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest">
                Trending
              </h4>
              <TrendingUp className="w-4 h-4 text-brand-blue shrink-0" />
            </div>

            <div className="space-y-3.5">
              {trendingTopics.slice(0, 4).map((item) => (
                <div
                  key={item.tag}
                  onClick={() => handleHashtagClick(item.tag)}
                  className="text-xs space-y-0.5 cursor-pointer group"
                >
                  <h5 className={`font-bold transition-colors ${
                    activeHashtag?.toLowerCase() === item.tag.replace('#','').toLowerCase()
                      ? 'text-brand-blue'
                      : 'text-[#212120] group-hover:text-brand-blue'
                  }`}>
                    {item.tag}
                  </h5>
                  <span className="text-[10px] text-gray-400 font-semibold block">{item.label}</span>
                </div>
              ))}
            </div>

            {trendingTopics.length > 4 && (
              <button
                onClick={() => setShowTrendsModal(true)}
                className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-bold py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                View All Trends ({trendingTopics.length})
              </button>
            )}
          </div>
          )}

          {/* Celebrations Birthday Widget */}
          {isLoading && profiles.length === 0 ? (
            <CelebrationsWidgetSkeleton />
          ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest">
                Celebrations
              </h4>
              <Cake className="w-4 h-4 text-brand-blue shrink-0" />
            </div>

            <div className="space-y-3.5">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-semibold italic py-2">No upcoming birthdays this month.</p>
              ) : (
                upcomingBirthdays.map((entry) => (
                  <Link
                    key={entry.profile.id}
                    href={`/profile/${entry.profile.id}?celebrate=true`}
                    className="flex items-center gap-2.5 group cursor-pointer rounded-xl hover:bg-gray-50 -mx-2 px-2 py-1 transition-colors"
                  >
                    <Avatar
                      src={entry.profile.avatar}
                      name={entry.profile.name}
                      size="sm"
                      className="shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-xs truncate group-hover:text-brand-blue transition-colors">{entry.profile.name}</p>
                      <span className={`text-[9.5px] font-semibold block leading-none mt-0.5 ${entry.isToday ? 'text-brand-blue' : 'text-gray-400'}`}>
                        {birthdayLabel(entry)}
                      </span>
                    </div>
                    <span className="text-base opacity-0 group-hover:opacity-100 transition-opacity shrink-0">🎂</span>
                  </Link>
                ))
              )}
            </div>

            <div className="bg-[#E8F0FE]/50 border border-[#D0E2FF] rounded-xl p-3 text-[10px] font-semibold text-brand-blue leading-relaxed flex gap-2">
              <Sparkles className="w-4 h-4 text-brand-blue shrink-0" />
              <span>Don't forget to send them a digital card!</span>
            </div>
          </div>
          )}

          {/* Hub Engagement CSS Bar Chart */}
          {engagementBars === null ? (
            <HubEngagementSkeleton />
          ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest border-b border-gray-100 pb-2">
              Hub Engagement
            </h4>

            {engagementEmpty ? (
              <div className="h-28 flex flex-col items-center justify-center text-center gap-2">
                <TrendingUp className="w-6 h-6 text-gray-300" />
                <p className="text-[11px] font-semibold text-gray-400 max-w-[180px]">
                  Engagement data will appear as members check in.
                </p>
              </div>
            ) : (
            <div className="h-28 flex items-end justify-around gap-2.5 pt-4">
              {engagementBars.map((item) => {
                // Scale relative to the busiest day in the window; floor any
                // nonzero day at 8% so it stays visibly distinct from a zero day.
                const heightPct = item.count > 0
                  ? Math.max(8, Math.round((item.count / engagementMax) * 100))
                  : 0;
                return (
                <div key={item.key} className="flex flex-col items-center flex-1 h-full">
                  <div className="flex-1 w-full flex items-end min-h-0">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        item.isToday
                          ? 'bg-brand-blue shadow-sm shadow-brand-blue/20'
                          : 'bg-[#DCE6F1] hover:bg-[#C2D3E7]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${item.count} check-in${item.count === 1 ? '' : 's'}`}
                    ></div>
                  </div>
                  <span className={`text-[8.5px] font-bold mt-1.5 shrink-0 ${item.isToday ? 'text-brand-blue font-extrabold' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
                );
              })}
            </div>
            )}
          </div>
          )}

        </div>

      </div>

      {/* Trends Modal */}
      {showTrendsModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setShowTrendsModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-blue shrink-0" />
                <h3 className="text-sm font-extrabold text-gray-900">All Trending Topics</h3>
                <span className="bg-brand-blue/10 text-brand-blue text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {trendingTopics.length} topics
                </span>
              </div>
              <button
                onClick={() => setShowTrendsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <span className="text-sm leading-none font-bold">✕</span>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-1">
              {trendingTopics.map((item, i) => {
                const cleanTag = item.tag.replace('#', '');
                const isActive = activeHashtag?.toLowerCase() === cleanTag.toLowerCase();
                return (
                  <button
                    key={item.tag}
                    onClick={() => { handleHashtagClick(item.tag); setShowTrendsModal(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group cursor-pointer ${
                      isActive ? 'bg-brand-blue text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold w-5 text-right shrink-0 ${isActive ? 'text-white/60' : 'text-gray-300'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-gray-900 group-hover:text-brand-blue'}`}>
                          {item.tag}
                        </p>
                        <span className={`text-[10px] font-semibold ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                          {item.label}
                        </span>
                      </div>
                    </div>
                    <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/70' : 'text-gray-300 group-hover:text-brand-blue'}`} />
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 shrink-0">
              <p className="text-[10px] text-gray-400 font-semibold text-center">
                Click any topic to filter the feed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transient toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-brand-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-brand-green" />
          {toast}
        </div>
      )}

      {/* Admin Feature Member Spotlight Modal */}
      {canManageSpotlights && (
        <CreateSpotlightModal
          open={showSpotlightModal}
          onClose={() => setShowSpotlightModal(false)}
          profiles={profiles}
          onSubmit={async (data) => {
            await addSpotlight(data);
            showToast('Member spotlight published successfully!');
          }}
        />
      )}
    </DashboardLayout>
  );
}

export default function HomeDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading community feed...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
