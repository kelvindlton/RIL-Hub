'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Event,
  Post,
  WelfareRequest,
  Complaint,
  AppNotification,
  initialProfiles,
} from '@/lib/mockDb';
import { createClient } from '@/utils/supabase/client';
import { DEFAULT_AVATAR } from '@/lib/avatar';
import * as postsData from '@/data/posts';
import * as eventsData from '@/data/events';
import * as welfareData from '@/data/welfare';
import * as profilesData from '@/data/profiles';
import * as avatarsData from '@/data/avatars';
import * as attendanceData from '@/data/attendance';
import * as spotlightsData from '@/data/spotlights';
import type { Spotlight } from '@/data/spotlights';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠  Do NOT reintroduce localStorage (or any client-side) caching for
//    server-authoritative state — check-ins, points, streaks.
//    2026-08-20 incident: a leftover `ril_daily_checkins` localStorage cache
//    masked real DB state for hours after check-ins were made server-authoritative
//    — users saw a false "already checked in today" until they cleared storage.
//    All such state must be sourced live from Supabase / RPCs only
//    (record_daily_checkin, fetchDailyCheckInStatus, hub_engagement_last_7_days).
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyCheckInRecord {
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM
  streak: number;
  totalDays: number;
}

export interface DailyCheckInStatus {
  checkedInToday: boolean;
  checkInTime?: string;
  streak: number;
  totalDays: number;
  isLoading: boolean;
}

interface AppContextType {
  currentUser: UserProfile;
  isUserLoading: boolean;
  profiles: UserProfile[];
  events: Event[];
  posts: Post[];
  welfareRequests: WelfareRequest[];
  complaints: Complaint[];
  spotlights: Spotlight[];
  notifications: AppNotification[];
  unreadCount: number;
  dailyCheckIns: Record<string, DailyCheckInRecord>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetchData: () => Promise<void>;
  setCurrentUser: (user: UserProfile) => void;
  addPost: (content: string, tags: string[], image?: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<{ success: boolean; message?: string }>;
  toggleRsvp: (eventId: string) => Promise<void>;
  checkInUser: (eventId: string, userId: string, method: 'qr' | 'manual') => Promise<{ success: boolean; message: string }>;
  recordDailyCheckIn: (userId: string, lat?: number, lon?: number) => Promise<{ success: boolean; message?: string }>;
  getDailyCheckInStatus: (userId: string) => DailyCheckInStatus;
  hubEngagement: attendanceData.HubEngagementDay[] | null;
  refetchHubEngagement: () => Promise<void>;
  addEvent: (eventData: Omit<Event, 'id' | 'rsvpCount' | 'isRsvped' | 'checkedInUsers'>) => Promise<void>;
  addSpotlight: (params: { userId: string; category: string; badgeLabel: string; quote: string; tags: string[]; theme: 'blue' | 'white' }) => Promise<void>;
  updateOwnProfile: (updates: Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>) => Promise<void>;
  uploadOwnAvatar: (image: Blob) => Promise<string>;
  setOwnAvatar: (image: Blob) => Promise<void>;
  removeOwnAvatar: () => Promise<void>;
  addWelfareRequest: (type: 'welfare' | 'suggestion', title: string, content: string, priority: 'low' | 'medium' | 'high' | 'critical') => Promise<void>;
  addComplaint: (title: string, content: string, priority: 'low' | 'medium' | 'high' | 'critical') => Promise<string>;
  updateWelfareStatus: (requestId: string, status: 'open' | 'in_progress' | 'resolved') => Promise<void>;
  updateComplaintStatus: (complaintId: string, status: 'open' | 'in_progress' | 'resolved') => Promise<void>;
  rewardUser: (userId: string, pointsEarned: number) => void;
  pushNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Simulated channel bot replies for real-time discussions effect
const simulatedReplies: Record<string, { senderName: string; senderAvatar: string; senderRole: string; replies: string[] }> = {
  'general': {
    senderName: 'David Miller',
    senderAvatar: '/avatars/david_m.png',
    senderRole: 'Staff',
    replies: [
      'Sounds great! Let me know if you need anything from the hardware lab. 🔧',
      'Agreed! The new 3D printer is producing amazing results with the carbon-fiber composite filament.',
      'Good point! I\'ll bring it up at the next team standup.',
    ]
  },
  'ai-lab': {
    senderName: 'Sarah Jenkins',
    senderAvatar: '/avatars/sarah.png',
    senderRole: 'Member',
    replies: [
      'Yes! Quantization drops perplexity only marginally with INT4. Try llama.cpp for edge deployment. 🤖',
      'Also check out GGUF format — it\'s much lighter for Raspberry Pi inference!',
      'Let me share my benchmark config in the shared drive.',
    ]
  },
  'iot-sandbox': {
    senderName: 'David Miller',
    senderAvatar: '/avatars/david_m.png',
    senderRole: 'Staff',
    replies: [
      'Copper boards restock just arrived! Also we have new JST connectors in the parts bin. 🪛',
      'Remember to sign out components on the IoT inventory sheet!',
    ]
  },
  'dallas-hub': {
    senderName: 'David Wilson',
    senderAvatar: '/avatars/david_w.png',
    senderRole: 'Alumni',
    replies: [
      'Looking forward to connecting with everyone this Thursday! Come with your pitch deck. 💼',
      'Also reach me on LinkedIn — happy to do async reviews before the live session.',
    ]
  }
};

export { simulatedReplies };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserProfile>(initialProfiles[0]);
  // The resolved *authenticated* user id — a real Supabase UUID once auth resolves,
  // null when resolved-but-signed-out (or an auth/env failure), and undefined while
  // still resolving. Per-user DB queries MUST key off this, never currentUser.id:
  // currentUser is seeded with a mock profile (initialProfiles[0], id 'user-sarah')
  // for first paint, and querying uuid columns with that non-UUID id returns 400.
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined);
  // Start data collections EMPTY so skeleton loaders show during the initial Supabase fetch.
  // Initialising with mock data caused a flash-of-placeholder-content before real data arrived.
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [welfareRequests, setWelfareRequests] = useState<WelfareRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [isCheckInLoading, setIsCheckInLoading] = useState<boolean>(true);
  const [hubEngagement, setHubEngagement] = useState<attendanceData.HubEngagementDay[] | null>(null);
  // Check-in status is sourced ONLY from the DB (fetchDailyCheckInStatus) and the
  // record_daily_checkin RPC — never localStorage. Starting empty prevents a stale
  // optimistic cache from masquerading as truth; the 1b effect below hydrates it.
  const [dailyCheckIns, setDailyCheckIns] = useState<Record<string, DailyCheckInRecord>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadLiveData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [loadedProfiles, loadedPosts, loadedEvents, loadedWelfare, loadedComplaints, loadedSpotlights] = await Promise.allSettled([
        profilesData.fetchProfiles(),
        postsData.fetchPosts(),
        eventsData.fetchEvents(),
        welfareData.fetchWelfareRequests(),
        welfareData.fetchComplaints(),
        spotlightsData.fetchSpotlights(),
      ]);

      if (loadedProfiles.status === 'fulfilled' && loadedProfiles.value.length > 0) {
        setProfiles(loadedProfiles.value);
      }
      if (loadedPosts.status === 'fulfilled' && loadedPosts.value.length > 0) {
        setPosts(loadedPosts.value);
      }
      if (loadedEvents.status === 'fulfilled' && loadedEvents.value.length > 0) {
        setEvents(loadedEvents.value);
      }
      if (loadedWelfare.status === 'fulfilled' && loadedWelfare.value.length > 0) {
        setWelfareRequests(loadedWelfare.value);
      }
      if (loadedComplaints.status === 'fulfilled' && loadedComplaints.value.length > 0) {
        setComplaints(loadedComplaints.value);
      }
      // Unconditional update so 0 spotlights correctly triggers the designed Empty State
      if (loadedSpotlights.status === 'fulfilled') {
        setSpotlights(loadedSpotlights.value);
      }
    } catch (err: any) {
      console.warn('Using local fallback state until Supabase connection is established:', err);
      setIsError(true);
      setErrorMessage(err?.message || 'Failed to sync with live data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hub Engagement — aggregate check-in counts for the trailing 7 days.
  // Lifted into context so a successful check-in can refresh the chart
  // immediately (see recordDailyCheckIn) with no manual page refresh.
  const refetchHubEngagement = useCallback(async () => {
    const rows = await attendanceData.fetchHubEngagementLast7Days();
    setHubEngagement(rows);
  }, []);

  // 1. Fetch initial live data on mount
  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // 1a. Load the hub engagement chart on mount (aggregate, RPC-backed).
  useEffect(() => {
    refetchHubEngagement();
  }, [refetchHubEngagement]);

  // 1a-cleanup. One-time migration: drop the legacy localStorage check-in cache.
  // Older builds persisted optimistic state here and read it back as truth, which
  // could show a false "already checked in" after the RPC rewrite. The DB is
  // authoritative now, so delete the key outright (no-op once it's gone).
  useEffect(() => {
    try { localStorage.removeItem('ril_daily_checkins'); } catch {}
  }, []);

  // 1b. Hydrate daily check-in status from Supabase once the AUTHENTICATED user
  //     resolves. Keyed on authUserId (a real UUID), never currentUser.id — firing
  //     this with the mock seed 'user-sarah' 400s on Postgres uuid columns.
  useEffect(() => {
    // Auth not resolved yet: leave isCheckInLoading in its initial `true` state so
    // the UI shows a skeleton rather than a premature "not checked in".
    if (authUserId === undefined) return;

    // Resolved but signed out (or auth/env failure). AppProvider lives in the root
    // layout, so this effect also runs on /login, /signup, /auth/* (middleware
    // exempts those) and when Supabase env is unset (middleware skips guarding and
    // createClient falls back to placeholder creds). Settle to a definite
    // not-loading state instead of spinning — do NOT rely on the route guard to
    // keep logged-out users away from this component.
    if (authUserId === null) {
      setIsCheckInLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const cachedRecord = dailyCheckIns[authUserId];
    if (!cachedRecord || cachedRecord.date !== today) {
      setIsCheckInLoading(true);
    }

    attendanceData.fetchDailyCheckInStatus(authUserId)
      .then((status) => {
        // The DB is authoritative in BOTH directions: set the entry when it
        // confirms a check-in, and clear any entry when it reports none — so a
        // stale "checked in" state can never survive a hydration.
        setDailyCheckIns(prev => {
          if (status.checkedInToday) {
            return {
              ...prev,
              [authUserId]: {
                date: today,
                time: status.checkInTime || '',
                streak: status.streak,
                totalDays: status.totalDays,
              },
            };
          }
          if (!(authUserId in prev)) return prev;
          const next = { ...prev };
          delete next[authUserId];
          return next;
        });
      })
      .catch(() => {
        // Supabase unavailable — local optimistic state will be used
      })
      .finally(() => {
        setIsCheckInLoading(false);
      });
  }, [authUserId]);

  // 2. Listen to active auth user & session changes. This is the ONLY writer of
  //    authUserId — every path below moves it out of `undefined` (to a UUID or
  //    null), including failures, so effect 1b's loader can never hang.
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser()
        .then(({ data: { user } }) => {
          setAuthUserId(user?.id ?? null);
          if (user) {
            profilesData.fetchProfileById(user.id).then((profile) => {
              if (profile) {
                setCurrentUserState(profile);
              } else {
                setCurrentUserState((prev) => ({
                  ...prev,
                  id: user.id,
                  email: user.email || prev.email,
                  name: user.user_metadata?.name || prev.name,
                }));
              }
            });
          }
        })
        .catch(() => {
          // getUser failed (network / bad creds) — treat as signed out so the
          // check-in loader settles instead of spinning.
          setAuthUserId(null);
        });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setAuthUserId(session?.user?.id ?? null);
        if (session?.user) {
          const profile = await profilesData.fetchProfileById(session.user.id);
          if (profile) {
            setCurrentUserState(profile);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // createClient threw (shouldn't, given placeholder fallback — but be safe):
      // resolve auth to signed-out so effect 1b doesn't hang on `undefined`.
      setAuthUserId(null);
    }
  }, []);

  const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 30));
  }, []);

  // 3. Supabase Realtime Subscriptions for live updates
  useEffect(() => {
    try {
      const supabase = createClient();
      const channel = supabase
        .channel('public_db_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async () => {
          const updatedPosts = await postsData.fetchPosts();
          if (updatedPosts.length > 0) setPosts(updatedPosts);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const n = payload.new as any;
          if (n.user_id === currentUser.id) {
            pushNotification({
              type: n.type,
              title: n.title,
              body: n.body,
              avatar: n.avatar,
              link: n.link,
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignored if client env is not ready
    }
  }, [currentUser.id, pushNotification]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const rewardUser = (userId: string, pointsEarned: number) => {
    setProfiles(prev =>
      prev.map(profile =>
        profile.id === userId
          ? {
              ...profile,
              points: profile.points + pointsEarned,
              streak: pointsEarned >= 50 ? profile.streak + 1 : profile.streak
            }
          : profile
      )
    );
    if (currentUser.id === userId) {
      setCurrentUserState(prev => ({
        ...prev,
        points: prev.points + pointsEarned,
        streak: pointsEarned >= 50 ? prev.streak + 1 : prev.streak
      }));
    }
  };

  const addPost = async (content: string, tags: string[], image?: string) => {
    try {
      await postsData.createPost(content, tags, image);
      const updated = await postsData.fetchPosts();
      setPosts(updated);
      rewardUser(currentUser.id, 10);
    } catch {
      // Fallback local optimistic post
      const newPost: Post = {
        id: `post-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        authorRole: currentUser.role,
        content,
        image,
        likes: 0,
        likedBy: [],
        bookmarks: 0,
        bookmarkedBy: [],
        comments: [],
        shares: 0,
        tags,
        timestamp: 'Just now',
        isPinned: false
      };
      setPosts(prev => [newPost, ...prev]);
      rewardUser(currentUser.id, 10);
    }
  };

  const likePost = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    const isLiked = targetPost ? targetPost.likedBy.includes(currentUser.id) : false;

    // Optimistic update
    setPosts(prev =>
      prev.map(post => {
        if (post.id === postId) {
          const alreadyLiked = post.likedBy.includes(currentUser.id);
          return {
            ...post,
            likes: alreadyLiked ? post.likes - 1 : post.likes + 1,
            likedBy: alreadyLiked
              ? post.likedBy.filter(id => id !== currentUser.id)
              : [...post.likedBy, currentUser.id]
          };
        }
        return post;
      })
    );

    try {
      await postsData.togglePostLike(postId, isLiked);
    } catch {
      // Retained optimistic state
    }
  };

  const bookmarkPost = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    const isBookmarked = targetPost ? targetPost.bookmarkedBy.includes(currentUser.id) : false;

    setPosts(prev =>
      prev.map(post => {
        if (post.id === postId) {
          const alreadyBookmarked = post.bookmarkedBy.includes(currentUser.id);
          return {
            ...post,
            bookmarks: alreadyBookmarked ? post.bookmarks - 1 : post.bookmarks + 1,
            bookmarkedBy: alreadyBookmarked
              ? post.bookmarkedBy.filter(id => id !== currentUser.id)
              : [...post.bookmarkedBy, currentUser.id]
          };
        }
        return post;
      })
    );

    try {
      await postsData.togglePostBookmark(postId, isBookmarked);
    } catch {
      // Retained optimistic state
    }
  };

  const addComment = async (postId: string, content: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content,
      timestamp: 'Just now'
    };

    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    );
    rewardUser(currentUser.id, 5);

    try {
      await postsData.addCommentToPost(postId, content);
    } catch {
      // Retained optimistic state
    }
  };

  const deletePost = async (postId: string): Promise<{ success: boolean; message?: string }> => {
    // Deliberately NOT optimistic. Unlike addPost/likePost (which keep a local
    // fallback on error), a delete must await the DB and only drop the post from
    // state on a confirmed success — a failed or RLS-blocked delete has to leave
    // the post visible and surface a real error, never silently disappear it.
    try {
      await postsData.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete post.' };
    }
  };

  const toggleRsvp = async (eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId);
    const isRsvped = targetEvent?.isRsvped || false;

    setEvents(prev =>
      prev.map(event => {
        if (event.id === eventId) {
          const willRsvp = !event.isRsvped;
          return {
            ...event,
            isRsvped: willRsvp,
            rsvpCount: willRsvp ? event.rsvpCount + 1 : Math.max(0, event.rsvpCount - 1)
          };
        }
        return event;
      })
    );

    try {
      await eventsData.toggleEventRsvp(eventId, isRsvped);
    } catch {
      // Retained optimistic state
    }
  };

  const checkInUser = async (eventId: string, userId: string, method: 'qr' | 'manual'): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await eventsData.checkInUserToEvent(eventId, userId, method);
      if (res.success) {
        setEvents(prev =>
          prev.map(event =>
            event.id === eventId
              ? { ...event, checkedInUsers: [...new Set([...event.checkedInUsers, userId])] }
              : event
          )
        );
        rewardUser(userId, 100);
      }
      return res;
    } catch {
      // Fallback
      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? { ...event, checkedInUsers: [...new Set([...event.checkedInUsers, userId])] }
            : event
        )
      );
      rewardUser(userId, 100);
      return { success: true, message: 'Check-in verified successfully!' };
    }
  };

  const recordDailyCheckIn = async (
    userId: string,
    lat?: number,
    lon?: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const today = new Date().toISOString().split('T')[0];

    // Server-authoritative write. No optimistic guessing: we apply exactly what
    // the RPC reports, and on failure we change nothing and surface the message.
    const result = await attendanceData.recordDailyCheckIn(userId, lat, lon);

    if (!result.success) {
      return { success: false, message: result.message ?? 'Check-in failed. Please try again.' };
    }

    const record: DailyCheckInRecord = {
      date: today,
      time: result.checkInTime ?? '',
      streak: result.streak ?? 0,
      totalDays: result.totalDays ?? 0,
    };
    setDailyCheckIns(prev => ({ ...prev, [userId]: record }));

    // Sync the profile balance/streak to the server truth returned by the RPC.
    setProfiles(prev => prev.map(p =>
      p.id === userId
        ? { ...p, points: result.points ?? p.points, streak: result.streak ?? p.streak }
        : p,
    ));
    if (currentUser.id === userId) {
      setCurrentUserState(prev => ({
        ...prev,
        points: result.points ?? prev.points,
        streak: result.streak ?? prev.streak,
      }));
    }

    // The check-in changed today's aggregate — refresh the engagement chart so
    // it updates alongside the check-in card without a manual page refresh.
    void refetchHubEngagement();

    return { success: true };
  };

  const getDailyCheckInStatus = (userId: string): DailyCheckInStatus => {
    const today = new Date().toISOString().split('T')[0];
    const record = dailyCheckIns[userId];
    const userProfile = profiles.find(p => p.id === userId) || currentUser;

    // Strict validation: must match today's date
    if (record && record.date === today) {
      return {
        checkedInToday: true,
        checkInTime: record.time,
        streak: record.streak,
        totalDays: record.totalDays,
        isLoading: false,
      };
    }

    return {
      checkedInToday: false,
      streak: userProfile?.streak || 0,
      totalDays: 0,
      isLoading: isCheckInLoading,
    };
  };

  const addEvent = async (eventData: Omit<Event, 'id' | 'rsvpCount' | 'isRsvped' | 'checkedInUsers'>) => {
    try {
      await eventsData.createEvent({
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        date: eventData.date,
        time: eventData.time,
        category: eventData.category,
        maxCapacity: eventData.maxCapacity,
      });
      const updated = await eventsData.fetchEvents();
      setEvents(updated);
    } catch {
      const newEvent: Event = {
        ...eventData,
        id: `event-${Date.now()}`,
        rsvpCount: 0,
        isRsvped: false,
        qrCodeHash: `qr_ril_${Date.now()}`,
        checkedInUsers: []
      };
      setEvents(prev => [...prev, newEvent]);
    }
  };

  const addWelfareRequest = async (
    type: 'welfare' | 'suggestion',
    title: string,
    content: string,
    priority: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    try {
      await welfareData.submitWelfareRequest(type, title, content, priority);
      const updated = await welfareData.fetchWelfareRequests();
      setWelfareRequests(updated);
    } catch {
      const newRequest: WelfareRequest = {
        id: `welfare-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        type,
        title,
        content,
        priority,
        status: 'open',
        date: new Date().toISOString().split('T')[0]
      };
      setWelfareRequests(prev => [newRequest, ...prev]);
    }
  };

  const addComplaint = async (
    title: string,
    content: string,
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<string> => {
    try {
      const trackingCode = await welfareData.submitComplaint(title, content, priority);
      const updated = await welfareData.fetchComplaints();
      setComplaints(updated);
      return trackingCode;
    } catch {
      const trackingCode = `COMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const newComplaint: Complaint = {
        id: `complaint-${Date.now()}`,
        trackingCode,
        title,
        content,
        priority,
        status: 'open',
        date: new Date().toISOString().split('T')[0]
      };
      setComplaints(prev => [newComplaint, ...prev]);
      return trackingCode;
    }
  };

  const updateWelfareStatus = async (requestId: string, status: 'open' | 'in_progress' | 'resolved') => {
    setWelfareRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status } : r)
    );
    try {
      await welfareData.updateWelfareStatus(requestId, status);
    } catch {
      // Retained optimistic state
    }
  };

  const updateComplaintStatus = async (complaintId: string, status: 'open' | 'in_progress' | 'resolved') => {
    setComplaints(prev =>
      prev.map(c => c.id === complaintId ? { ...c, status } : c)
    );
    try {
      await welfareData.updateComplaintStatus(complaintId, status);
    } catch {
      // Retained optimistic state
    }
  };

  const addSpotlight = async (params: {
    userId: string;
    category: string;
    badgeLabel: string;
    quote: string;
    tags: string[];
    theme: 'blue' | 'white';
  }) => {
    try {
      const newSpotlight = await spotlightsData.createSpotlight(params);
      // Immediately prepend to state so the Spotlights tab updates without requiring a page refresh
      setSpotlights(prev => [newSpotlight, ...prev]);
    } catch (err) {
      console.error('Failed to create spotlight:', err);
      throw err;
    }
  };

  // Edits the SIGNED-IN member's own profile. Keys off authUserId, never
  // currentUser.id — currentUser is seeded with the mock 'user-sarah' until auth
  // resolves, and .eq('id', 'user-sarah') against a uuid column returns 400. That
  // also makes this correctly refuse to run before auth resolves.
  //
  // Server-side scope is enforced by RLS (own-profile UPDATE) plus the
  // guard_profile_role_points trigger; nothing here is trusted to restrict fields.
  // Syncs currentUser and the profiles array from the RETURNED row so the profile
  // page and directory reflect the edit with no refetch, and no client-side cache:
  // the mapped server row is the only thing written to state.
  const updateOwnProfile = async (
    updates: Partial<Omit<UserProfile, 'id' | 'points' | 'streak' | 'role'>>
  ) => {
    if (!authUserId) {
      throw new Error('You must be signed in to edit your profile.');
    }
    try {
      const updated = await profilesData.updateProfile(authUserId, updates);
      setCurrentUserState(updated);
      setProfiles(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  // Uploads a new avatar for the SIGNED-IN member and returns its public URL.
  // Same authUserId guard as updateOwnProfile, for the same reason: the storage
  // path IS the ownership claim, and currentUser.id is the seeded mock id until
  // auth resolves.
  //
  // Deliberately does NOT write profiles.avatar_url — the caller submits the URL
  // with the rest of the form through updateOwnProfile. Keeping the two calls
  // separate is what lets the modal distinguish "the photo never uploaded, so
  // nothing was saved" from "the photo uploaded but the profile row didn't save";
  // one combined action could only report a single, ambiguous failure.
  const uploadOwnAvatar = async (image: Blob): Promise<string> => {
    if (!authUserId) {
      throw new Error('You must be signed in to change your photo.');
    }
    try {
      return await avatarsData.uploadAvatar(authUserId, image);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      throw err;
    }
  };

  // The viewer's equivalent of uploadOwnAvatar + updateOwnProfile in one call.
  // EditProfileModal keeps them separate because it has a Save button and other
  // fields to save; the avatar viewer has neither — the photo IS the whole edit —
  // so it needs one action that finishes the job.
  //
  // The two failure modes stay distinguishable, which is why this doesn't just
  // chain the two promises: the messages below are the only way the member can
  // tell "nothing changed" from "your photo is stored but your profile still
  // points at the old one".
  const setOwnAvatar = async (image: Blob): Promise<void> => {
    if (!authUserId) {
      throw new Error('You must be signed in to change your photo.');
    }

    let url: string;
    try {
      url = await avatarsData.uploadAvatar(authUserId, image);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      const detail = err instanceof Error ? err.message : 'Please try again.';
      throw new Error(`Your photo could not be uploaded, so nothing was changed. ${detail}`);
    }

    try {
      // Syncs currentUser and the profiles array from the returned row, so every
      // avatar on screen updates without a refetch.
      await updateOwnProfile({ avatar: url });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Please try again.';
      throw new Error(`Your photo uploaded, but your profile didn't update. ${detail}`);
    }
  };

  // Row FIRST, object second — deliberately the inverse of the upload order.
  //
  // If the row reset succeeds and the delete fails, the result is an orphaned
  // object nobody references, and the next upload upserts over it at the same
  // fixed path. The other order risks a row naming a file that no longer exists,
  // which is a broken image for every member who sees this avatar. So the delete
  // failure is logged and swallowed: the member's photo IS gone as far as the app
  // is concerned, and telling them it failed would be wrong.
  const removeOwnAvatar = async (): Promise<void> => {
    if (!authUserId) {
      throw new Error('You must be signed in to change your photo.');
    }

    await updateOwnProfile({ avatar: DEFAULT_AVATAR });

    try {
      await avatarsData.deleteAvatar(authUserId);
    } catch (err) {
      console.error('Avatar reset, but the stored file could not be deleted:', err);
    }
  };

  // True while we don't yet have the real authenticated profile loaded. Covers
  // authUserId === undefined (auth unresolved), null (signed-out / auth failure),
  // and the gap where authUserId is a UUID but fetchProfileById hasn't updated
  // currentUser yet. Only currentUser.id === authUserId is trustworthy, so identity
  // displays gate on this and never render the seeded mock profile. Consistent with
  // the "empty collections + skeleton over mock data" choice above.
  const isUserLoading = !authUserId || currentUser.id !== authUserId;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isUserLoading,
        profiles,
        events,
        posts,
        welfareRequests,
        complaints,
        spotlights,
        notifications,
        unreadCount,
        dailyCheckIns,
        isLoading,
        isError,
        errorMessage,
        refetchData: loadLiveData,
        setCurrentUser: setCurrentUserState,
        addPost,
        likePost,
        bookmarkPost,
        addComment,
        deletePost,
        toggleRsvp,
        checkInUser,
        recordDailyCheckIn,
        getDailyCheckInStatus,
        hubEngagement,
        refetchHubEngagement,
        addEvent,
        addSpotlight,
        updateOwnProfile,
        uploadOwnAvatar,
        setOwnAvatar,
        removeOwnAvatar,
        addWelfareRequest,
        addComplaint,
        updateWelfareStatus,
        updateComplaintStatus,
        rewardUser,
        pushNotification,
        markAllRead,
        markRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
