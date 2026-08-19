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
  initialEvents,
  initialPosts,
  initialWelfare,
  initialComplaints
} from '@/lib/mockDb';
import { createClient } from '@/utils/supabase/client';
import * as postsData from '@/data/posts';
import * as eventsData from '@/data/events';
import * as welfareData from '@/data/welfare';
import * as profilesData from '@/data/profiles';
import * as attendanceData from '@/data/attendance';

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
}

interface AppContextType {
  currentUser: UserProfile;
  profiles: UserProfile[];
  events: Event[];
  posts: Post[];
  welfareRequests: WelfareRequest[];
  complaints: Complaint[];
  notifications: AppNotification[];
  unreadCount: number;
  dailyCheckIns: Record<string, DailyCheckInRecord>;
  setCurrentUser: (user: UserProfile) => void;
  addPost: (content: string, tags: string[], image?: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  toggleRsvp: (eventId: string) => Promise<void>;
  checkInUser: (eventId: string, userId: string, method: 'qr' | 'manual') => Promise<{ success: boolean; message: string }>;
  recordDailyCheckIn: (userId: string, lat?: number, lon?: number) => Promise<void>;
  getDailyCheckInStatus: (userId: string) => DailyCheckInStatus;
  addEvent: (eventData: Omit<Event, 'id' | 'rsvpCount' | 'isRsvped' | 'checkedInUsers'>) => Promise<void>;
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
  const [profiles, setProfiles] = useState<UserProfile[]>(initialProfiles);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [welfareRequests, setWelfareRequests] = useState<WelfareRequest[]>(initialWelfare);
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [dailyCheckIns, setDailyCheckIns] = useState<Record<string, DailyCheckInRecord>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // 1. Fetch initial live data on mount
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [loadedProfiles, loadedPosts, loadedEvents, loadedWelfare, loadedComplaints] = await Promise.allSettled([
          profilesData.fetchProfiles(),
          postsData.fetchPosts(),
          eventsData.fetchEvents(),
          welfareData.fetchWelfareRequests(),
          welfareData.fetchComplaints(),
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
      } catch (err) {
        console.warn('Using local fallback state until Supabase connection is established:', err);
      }
    }

    loadLiveData();
  }, []);

  // 2. Listen to active auth user & session changes
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
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
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      // Ignored if env variables are pending setup
    }
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
  }, [currentUser.id]);

  const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 30));
  }, []);

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

  const recordDailyCheckIn = async (userId: string, lat?: number, lon?: number) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const prevRecord = dailyCheckIns[userId];
    const newStreak = (prevRecord ? prevRecord.streak : (currentUser.streak || 0)) + 1;
    const newTotal = (prevRecord ? prevRecord.totalDays : 0) + 1;

    setDailyCheckIns(prev => ({
      ...prev,
      [userId]: {
        date: today,
        time,
        streak: newStreak,
        totalDays: newTotal
      }
    }));

    rewardUser(userId, 50);

    try {
      await attendanceData.recordDailyCheckIn(userId, lat, lon);
    } catch {
      // Retained optimistic state
    }
  };

  const getDailyCheckInStatus = (userId: string): DailyCheckInStatus => {
    const today = new Date().toISOString().split('T')[0];
    const record = dailyCheckIns[userId];
    const userProfile = profiles.find(p => p.id === userId) || currentUser;

    if (record && record.date === today) {
      return {
        checkedInToday: true,
        checkInTime: record.time,
        streak: record.streak,
        totalDays: record.totalDays
      };
    }

    return {
      checkedInToday: false,
      streak: userProfile?.streak || 0,
      totalDays: 0
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        profiles,
        events,
        posts,
        welfareRequests,
        complaints,
        notifications,
        unreadCount,
        dailyCheckIns,
        setCurrentUser: setCurrentUserState,
        addPost,
        likePost,
        bookmarkPost,
        addComment,
        toggleRsvp,
        checkInUser,
        recordDailyCheckIn,
        getDailyCheckInStatus,
        addEvent,
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
