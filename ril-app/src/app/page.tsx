'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Image,
  Smile,
  Tag,
  Megaphone,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Cake,
  Award,
  Zap,
  CheckCircle
} from 'lucide-react';

function DashboardContent() {
  const {
    currentUser,
    profiles,
    posts,
    events,
    addPost,
    likePost,
    bookmarkPost,
    addComment,
    rewardUser
  } = useApp();

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

  const filteredPosts = activeHashtag
    ? posts.filter(p => p.tags.some(t => t.toLowerCase() === activeHashtag.toLowerCase()))
    : posts;

  const handleHashtagClick = (tag: string) => {
    const clean = tag.replace(/^#/, '');
    setActiveHashtag(prev => prev?.toLowerCase() === clean.toLowerCase() ? null : clean);
  };

  // Derive all tags from posts with real counts, then supplement with static trending data
  const allTrends = React.useMemo(() => {
    const tagMap: { [tag: string]: number } = {};
    posts.forEach(p => p.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const fromPosts = Object.entries(tagMap).map(([tag, postCount]) => ({
      tag: `#${tag}`,
      count: postCount === 1 ? '1 post' : `${postCount} posts`,
      postCount,
    })).sort((a, b) => b.postCount - a.postCount);
    // Supplement with static trending topics not in posts
    const staticExtras = [
      { tag: '#PortHarcourt', count: '3.4k mentions', postCount: 0 },
      { tag: '#SmartCity', count: '2.1k mentions', postCount: 0 },
      { tag: '#HardwareLab', count: '1.8k mentions', postCount: 0 },
      { tag: '#StartupScale', count: '1.5k mentions', postCount: 0 },
      { tag: '#DesignThinking', count: '1.1k mentions', postCount: 0 },
      { tag: '#GreenTech', count: '987 mentions', postCount: 0 },
      { tag: '#WomenInTech', count: '876 mentions', postCount: 0 },
      { tag: '#CommunityUpdate', count: '754 mentions', postCount: 0 },
      { tag: '#EdgeAI', count: '643 mentions', postCount: 0 },
      { tag: '#OpenSource', count: '512 mentions', postCount: 0 },
      { tag: '#Mentoring', count: '430 mentions', postCount: 0 },
      { tag: '#VentureCapital', count: '310 mentions', postCount: 0 },
    ].filter(e => !tagMap[e.tag.replace('#', '')]);
    return [...fromPosts, ...staticExtras];
  }, [posts]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };
  const copyPostLink = (postId: string) =>
    navigator.clipboard?.writeText(`${window.location.origin}/#${postId}`);

  const EMOJIS = ['🚀', '🎉', '🔥', '💡', '🤖', '🌱', '💙', '👏', '✅', '🛠️'];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewPostImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImage) return;

    const tagsArray = newPostTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    addPost(newPostContent, tagsArray, newPostImage || undefined);
    setNewPostContent('');
    setNewPostTags('');
    setNewPostImage(null);
    setShowEmoji(false);
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    addComment(postId, commentText);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT & MIDDLE: FEED COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {tab === 'feed' ? (
            <>
              {/* Status Composer Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex gap-4">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`What's on your mind today, ${currentUser.name.split(' ')[0]}?`}
                      rows={2}
                      className="w-full text-sm border-0 focus:ring-0 focus:outline-none p-1 placeholder-gray-400 resize-none font-medium text-gray-800"
                    />

                    {/* Selected image preview */}
                    {newPostImage && (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 max-h-60 w-fit">
                        <img src={newPostImage} alt="Upload preview" className="max-h-60 object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPostImage(null)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                          aria-label="Remove image"
                        >
                          <span className="text-xs leading-none">✕</span>
                        </button>
                      </div>
                    )}

                    {/* Emoji / Mood palette */}
                    {showEmoji && (
                      <div className="mt-2 flex flex-wrap gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-2">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewPostContent(prev => prev + emoji)}
                            className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-sm text-base flex items-center justify-center transition-all"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden file input for photo upload */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 hover:text-brand-blue transition-colors"
                    >
                      <Image className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmoji(v => !v)}
                      className={`flex items-center gap-1.5 hover:text-brand-blue transition-colors ${showEmoji ? 'text-brand-blue' : ''}`}
                    >
                      <Smile className="w-4 h-4 text-green-500 shrink-0" />
                      <span>Mood</span>
                    </button>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                      <Tag className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <input
                        type="text"
                        value={newPostTags}
                        onChange={(e) => setNewPostTags(e.target.value)}
                        placeholder="Tag"
                        className="bg-transparent border-none text-[10.5px] text-gray-600 focus:ring-0 focus:outline-none w-16 p-0 font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePostSubmit}
                    disabled={!newPostContent.trim() && !newPostImage}
                    className="bg-brand-blue text-white text-xs font-bold px-6 py-2 rounded-full hover:bg-brand-blue/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Publish
                  </button>
                </div>
              </div>

              {/* Official Announcement Card */}
              <div className="bg-gradient-to-r from-[#E8F0FE] to-[#F1F5F9] border border-[#D0E2FF] rounded-2xl p-6 shadow-sm relative overflow-hidden flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-blue text-white flex items-center justify-center shadow-md shrink-0">
                  <Megaphone className="w-6 h-6 fill-white/10" />
                </div>
                <div className="space-y-1.5 z-10 flex-1">
                  <span className="text-[9px] uppercase tracking-widest text-[#177AE5] font-black block">OFFICIAL ANNOUNCEMENT</span>
                  <h4 className="font-extrabold text-sm text-[#212120]">Port Harcourt Smart City IoT Hackathon</h4>
                  <p className="text-[11.5px] text-gray-600 leading-relaxed font-semibold">
                    36 hours of building hardware solutions for waste, traffic, and solar-grid challenges. RSVP closes soon — lock in your team on the Events board!
                  </p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] text-brand-blue/5 rotate-[-15deg] pointer-events-none select-none">
                  <Megaphone className="w-32 h-32" />
                </div>
              </div>

              {/* Active hashtag filter banner */}
              {activeHashtag && (
                <div className="flex items-center justify-between bg-brand-blue/5 border border-brand-blue/20 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-brand-blue flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    Showing posts tagged <span className="font-black">#{activeHashtag}</span>
                  </span>
                  <button
                    onClick={() => setActiveHashtag(null)}
                    className="text-[10px] font-bold text-gray-500 hover:text-brand-blue transition-colors"
                  >
                    Clear ✕
                  </button>
                </div>
              )}

              {/* Feed Posts */}
              <div className="space-y-6">
                {filteredPosts.length === 0 && activeHashtag && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">No posts tagged <span className="font-black text-brand-blue">#{activeHashtag}</span> yet.</p>
                  </div>
                )}
                {filteredPosts.map((post) => {
                  const isLiked = post.likedBy.includes(currentUser.id);
                  const isBookmarked = post.bookmarkedBy.includes(currentUser.id);
                  const isCommentsOpen = activeCommentsPostId === post.id;

                  return (
                    <div
                      key={post.id}
                      className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 relative ${
                        post.isPinned ? 'border-brand-blue/20' : 'border-gray-200'
                      }`}
                    >
                      {/* Feed Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-10 h-10 rounded-full border border-gray-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-gray-900 hover:underline cursor-pointer">{post.authorName}</span>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-[10px] text-gray-500 font-bold">{post.authorRole}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold block">{post.timestamp}</span>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-50"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuPostId === post.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setOpenMenuPostId(null)} />
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 text-xs font-semibold">
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
                      <div className="space-y-3.5">
                        <p className="text-xs text-gray-600 leading-relaxed font-semibold whitespace-pre-wrap">{post.content}</p>
                        
                        {post.image && (
                          <div className="rounded-xl overflow-hidden border border-gray-200 max-h-72">
                            <img
                              src={post.image}
                              alt="Post attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                onClick={() => handleHashtagClick(tag)}
                                className={`text-[9.5px] font-black px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
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
                      <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between text-gray-400">
                        <button
                          onClick={() => likePost(post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-black hover:text-red-500 transition-colors ${
                            isLiked ? 'text-red-500' : ''
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{post.likes}</span>
                        </button>

                        <button
                          onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-black hover:text-brand-blue transition-colors ${
                            isCommentsOpen ? 'text-brand-blue' : ''
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{post.comments.length}</span>
                        </button>

                        <button
                          onClick={() => bookmarkPost(post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-black hover:text-sky-blue transition-colors ${
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
                          className="flex items-center gap-1.5 text-[11px] font-black hover:text-brand-green transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      {/* Dynamic Comments box */}
                      {isCommentsOpen && (
                        <div className="border-t border-gray-100 pt-4 space-y-4 bg-gray-50/50 -mx-6 px-6 pb-4">
                          {post.comments.length > 0 && (
                            <div className="space-y-3">
                              {post.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2.5">
                                  <img
                                    src={comment.authorAvatar}
                                    alt={comment.authorName}
                                    className="w-7 h-7 rounded-full border border-gray-200 shrink-0"
                                  />
                                  <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-xs flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-900">{comment.authorName}</span>
                                      <span className="text-[9px] text-gray-400">{comment.timestamp}</span>
                                    </div>
                                    <p className="text-gray-700 mt-1 font-medium">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex gap-2.5">
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name}
                              className="w-7 h-7 rounded-full border border-gray-200 shrink-0"
                            />
                            <div className="flex-1 flex bg-white border border-gray-200 rounded-xl overflow-hidden px-2.5 py-1">
                              <input
                                type="text"
                                placeholder="Write a comment..."
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCommentInputs(prev => ({ ...prev, [post.id]: val }));
                                }}
                                className="bg-transparent border-none text-xs text-brand-black focus:ring-0 focus:outline-none w-full font-medium"
                              />
                              <button
                                type="submit"
                                disabled={!(commentInputs[post.id] || '').trim()}
                                className="text-brand-blue disabled:opacity-50 font-bold text-xs"
                              >
                                Send
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* --- SPOTLIGHTS VIEW --- */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-extrabold text-gray-900">Renaissance Spotlight Honors</h3>
                <p className="text-xs text-gray-500 mt-1">
                  We celebrate outstanding community contributions, leadership milestones, and tech innovations across the Port Harcourt and Dallas Hubs.
                </p>
              </div>

              {/* Spotlight 1: Marcus Obi */}
              <div className="bg-gradient-to-r from-[#177AE5] to-[#1258A3] text-white rounded-2xl p-6 shadow-md flex items-center relative overflow-hidden gap-5">
                <div className="relative shrink-0 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full border-4 border-yellow-400 p-0.5 shadow-lg overflow-hidden bg-white shrink-0">
                    <img src="/avatars/marcus.png" alt="Marcus Obi" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <span className="absolute bottom-[-6px] bg-yellow-400 text-brand-black text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white shadow-sm">
                    SPOTLIGHT
                  </span>
                </div>
                <div className="space-y-2.5 z-10 flex-1">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-sky-blue font-black block">MEMBER SPOTLIGHT</span>
                    <h4 className="font-extrabold text-sm text-white mt-0.5">Marcus Obi</h4>
                  </div>
                  <p className="text-[11.5px] text-white/95 leading-relaxed font-semibold italic">
                    "Marcus has poured incredible energy into the IoT Lab this month — prototyping smart-agriculture sensors and helping fellow builders get started with Arduino and Raspberry Pi rigs in the Hardware Sandbox."
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["IoT Lab Cohort 2025", "Hardware Innovation", "New Builder"].map((capsule) => (
                      <span key={capsule} className="bg-white/15 text-white border border-white/10 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                        {capsule}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spotlight 2: Maya Patterson */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center gap-5">
                <div className="relative shrink-0 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full border-4 border-brand-blue/30 p-0.5 shadow-md overflow-hidden bg-white shrink-0">
                    <img src="/avatars/maya.png" alt="Maya Patterson" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <span className="absolute bottom-[-6px] bg-brand-blue text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white shadow-sm">
                    CSS WIZARD
                  </span>
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-brand-blue font-black block">DESIGN SPOTLIGHT</span>
                    <h4 className="font-extrabold text-sm text-gray-900 mt-0.5">Maya Patterson</h4>
                  </div>
                  <p className="text-[11.5px] text-gray-600 leading-relaxed font-semibold">
                    Contributed an incredible landing layout grid with clean CSS modules for the incubator team dashboard this week. Kudos, Maya!
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* --- RIGHT COLUMN: SIDEBAR WIDGETS --- */}
        <div className="space-y-6">
          
          {/* Trending Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest">
                Trending
              </h4>
              <TrendingUp className="w-4 h-4 text-brand-blue shrink-0" />
            </div>

            <div className="space-y-3.5">
              {[
                { tag: '#MachineLearning', count: '1.2k conversations' },
                { tag: '#IoTSandbox', count: '856 members participating' },
                { tag: '#AgriTech', count: '42 new resources' },
                { tag: '#AlumniNetwork', count: '12 upcoming meetups' }
              ].map((item) => (
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
                  <span className="text-[10px] text-gray-400 font-semibold block">{item.count}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowTrendsModal(true)}
              className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-bold py-2 rounded-xl transition-all shadow-sm"
            >
              View All Trends
            </button>
          </div>

          {/* Celebrations Birthday Widget */}
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
                    <img
                      src={entry.profile.avatar}
                      alt={entry.profile.name}
                      className="w-8 h-8 rounded-full border border-gray-100 shrink-0 group-hover:scale-105 transition-transform"
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

          {/* Hub Engagement CSS Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-[#212120] uppercase tracking-widest border-b border-gray-100 pb-2">
              Hub Engagement
            </h4>

            <div className="h-28 flex items-end justify-around gap-2.5 pt-4">
              {[
                { day: 'Mon', height: '30%', active: false },
                { day: 'Tue', height: '50%', active: false },
                { day: 'Wed', height: '40%', active: false },
                { day: 'Today', height: '80%', active: true },
                { day: 'Fri', height: '70%', active: false },
                { day: 'Sat', height: '20%', active: false },
                { day: 'Sun', height: '10%', active: false }
              ].map((item) => (
                <div key={item.day} className="flex flex-col items-center flex-1 h-full">
                  <div className="flex-1 w-full flex items-end min-h-0">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        item.active
                          ? 'bg-brand-blue shadow-sm shadow-brand-blue/20'
                          : 'bg-[#DCE6F1] hover:bg-[#C2D3E7]'
                      }`}
                      style={{ height: item.height }}
                    ></div>
                  </div>
                  <span className={`text-[8.5px] font-bold mt-1.5 shrink-0 ${item.active ? 'text-brand-blue font-extrabold' : 'text-gray-400'}`}>
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Trends Modal */}
      {showTrendsModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setShowTrendsModal(false)}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal panel */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-blue shrink-0" />
                <h3 className="text-sm font-extrabold text-gray-900">All Trending Topics</h3>
                <span className="bg-brand-blue/10 text-brand-blue text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {allTrends.length} topics
                </span>
              </div>
              <button
                onClick={() => setShowTrendsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <span className="text-sm leading-none font-bold">✕</span>
              </button>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto px-6 py-4 space-y-1">
              {allTrends.map((item, i) => {
                const cleanTag = item.tag.replace('#', '');
                const isActive = activeHashtag?.toLowerCase() === cleanTag.toLowerCase();
                return (
                  <button
                    key={item.tag}
                    onClick={() => { handleHashtagClick(item.tag); setShowTrendsModal(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
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
                          {item.count}
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
