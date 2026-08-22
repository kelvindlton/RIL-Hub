-- ────────────────────────────────────────────────────────────────────────────
-- Spotlights: Admin-curated member honors (Option A)
-- Members can be featured by admin/staff with a custom category, badge,
-- narrative quote, tags, and visual theme. points_ledger-style RLS pattern:
-- public read, admin/staff-only write.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.spotlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'MEMBER SPOTLIGHT',
    badge_label TEXT NOT NULL DEFAULT 'SPOTLIGHT',
    quote TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    theme TEXT DEFAULT 'blue' CHECK (theme IN ('blue', 'white')),
    is_featured BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spotlights_featured_created
ON public.spotlights (is_featured, created_at DESC);

ALTER TABLE public.spotlights ENABLE ROW LEVEL SECURITY;

-- Public read (authenticated members only — matches init_schema convention).
CREATE POLICY "Spotlights are viewable by all members"
ON public.spotlights FOR SELECT TO authenticated USING (true);

-- Write access for admins/staff, checked against profiles.role (NOT the JWT
-- role claim, which is always 'authenticated' and would block everyone).
CREATE POLICY "Spotlights manageable by admins and staff"
ON public.spotlights FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'staff')
    )
);
