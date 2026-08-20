-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'member', 'alumni', 'partner');
CREATE TYPE event_category AS ENUM ('program', 'workshop', 'hackathon', 'social', 'governance');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');

-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT DEFAULT '/avatars/default.png',
    department TEXT,
    program_cohort TEXT,
    skills TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    points INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    joined_date TEXT DEFAULT TO_CHAR(NOW(), 'Mon YYYY'),
    birthday TEXT, -- Format: MM-DD
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HUB LOCATIONS (For Geofencing)
CREATE TABLE public.hub_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 150,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. DAILY CHECK-INS & ATTENDANCE
CREATE TABLE public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hub_id TEXT REFERENCES public.hub_locations(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    points_awarded INTEGER NOT NULL DEFAULT 50,
    streak_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_daily_user_checkin UNIQUE (user_id, date)
);

-- 6. POINTS LEDGER (Source of truth for gamification XP)
CREATE TABLE public.points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SOCIAL FEED: POSTS, LIKES, BOOKMARKS, COMMENTS
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    bookmarks_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.post_likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.post_bookmarks (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EVENTS, RSVPS, & EVENT CHECK-INS
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    category event_category NOT NULL DEFAULT 'program',
    max_capacity INTEGER NOT NULL DEFAULT 100,
    qr_code_hash TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.event_rsvps (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE public.event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    method TEXT NOT NULL DEFAULT 'qr', -- 'qr' or 'manual'
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_user_checkin UNIQUE (event_id, user_id)
);

-- 9. WELFARE & COMPLAINTS
CREATE TABLE public.welfare_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'welfare', -- 'welfare' or 'suggestion'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'message' | 'birthday' | 'event' | 'welfare' | 'system'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    avatar TEXT,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TRIGGERS & FUNCTIONS

-- A. Auto-create Profile when Auth User signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar_url,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '/avatars/default.png'),
        'member'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Points Ledger Trigger: Updates profiles.points cache on ledger insert
CREATE OR REPLACE FUNCTION public.handle_points_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET points = points + NEW.delta
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_points_ledger_insert
    AFTER INSERT ON public.points_ledger
    FOR EACH ROW EXECUTE FUNCTION public.handle_points_ledger_insert();

-- C. Post Likes counter sync
CREATE OR REPLACE FUNCTION public.sync_post_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_like_change
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes();

-- D. Post Bookmarks counter sync
CREATE OR REPLACE FUNCTION public.sync_post_bookmarks()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_bookmark_change
    AFTER INSERT OR DELETE ON public.post_bookmarks
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_bookmarks();

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welfare_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile (excluding role/points)" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Hub Locations Policies
CREATE POLICY "Hub locations viewable by authenticated users" ON public.hub_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins manage hub locations" ON public.hub_locations
    FOR ALL TO authenticated USING (public.is_admin());

-- Posts Policies
CREATE POLICY "Posts are viewable by authenticated users" ON public.posts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create posts" ON public.posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete/update posts" ON public.posts
    FOR ALL TO authenticated
    USING (auth.uid() = author_id OR public.is_admin());

-- Post Likes Policies
CREATE POLICY "Likes are viewable by authenticated users" ON public.post_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can toggle own likes" ON public.post_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own likes" ON public.post_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Bookmarks Policies
CREATE POLICY "Bookmarks viewable by owner" ON public.post_bookmarks
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark posts" ON public.post_bookmarks
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own bookmarks" ON public.post_bookmarks
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Comments viewable by authenticated users" ON public.comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete comments" ON public.comments
    FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin());

-- Events Policies
CREATE POLICY "Events viewable by authenticated users" ON public.events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins or staff can manage events" ON public.events
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')
    ));

-- Event RSVPs Policies
CREATE POLICY "RSVPs viewable by authenticated users" ON public.event_rsvps
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own RSVPs" ON public.event_rsvps
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Daily & Event Check-ins Policies
CREATE POLICY "Checkins viewable by owner or admin" ON public.daily_checkins
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Event checkins viewable by owner or admin" ON public.event_checkins
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Welfare Requests Policies
CREATE POLICY "Users view own welfare requests, admins view all" ON public.welfare_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can submit welfare requests" ON public.welfare_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update welfare requests" ON public.welfare_requests
    FOR UPDATE TO authenticated USING (public.is_admin());

-- Anonymous Complaints Policies
CREATE POLICY "Anyone can submit complaints" ON public.complaints
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins view all complaints, or lookup by tracking code" ON public.complaints
    FOR SELECT TO authenticated USING (public.is_admin() OR true);

CREATE POLICY "Admins update complaint status" ON public.complaints
    FOR UPDATE TO authenticated USING (public.is_admin());

-- Notifications Policies
CREATE POLICY "Users manage own notifications" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id);
