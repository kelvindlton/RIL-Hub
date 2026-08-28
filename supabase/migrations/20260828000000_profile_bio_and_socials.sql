-- ────────────────────────────────────────────────────────────────────────────
-- 20260828000000_profile_bio_and_socials.sql
--
-- Profile editing v1 — SCHEMA ONLY. Adds the self-describing fields the profile
-- page currently fakes or lacks outright:
--   headline    → replaces the synthesised getRoleTagline() role/department string
--   bio         → no About section exists today
--   *_url       → LinkedIn / GitHub / personal site
--
-- Constraints are defence-in-depth, not a substitute for app-layer validation:
--   bio      ≤ 500 chars
--   headline ≤ 120 chars   (renders on one line in the profile hero)
--   *_url    must be http(s)  — closes the javascript:/data: stored-XSS path,
--            where one member's saved URL would execute in another member's
--            browser once the UI renders these as href attributes. Enforced at
--            the DB so the invariant holds regardless of which client writes.
--
-- No RLS policy, guard-trigger, or GRANT changes are required (verified: the
-- own-profile UPDATE policy is row-level and names only `id`; the guard trigger
-- inspects only role/points; there are no column-level grants anywhere).
-- Data layer, context and UI are intentionally NOT touched by this migration.
-- Idempotent: add column if not exists throughout.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists headline text
    constraint profiles_headline_length
      check (headline is null or char_length(headline) <= 120),

  add column if not exists bio text
    constraint profiles_bio_length
      check (bio is null or char_length(bio) <= 500),

  add column if not exists linkedin_url text
    constraint profiles_linkedin_url_scheme
      check (linkedin_url is null or linkedin_url ~* '^https?://'),

  add column if not exists github_url text
    constraint profiles_github_url_scheme
      check (github_url is null or github_url ~* '^https?://'),

  add column if not exists website_url text
    constraint profiles_website_url_scheme
      check (website_url is null or website_url ~* '^https?://');

comment on column public.profiles.headline is
  'Short self-authored tagline shown under the member name (max 120 chars); replaces the derived role/department string.';
comment on column public.profiles.bio is
  'Longer About text, max 500 chars. Rendered in the profile About card.';
comment on column public.profiles.linkedin_url is
  'Member-supplied LinkedIn URL. DB-constrained to http(s); still validate at the app layer before rendering as an href.';
comment on column public.profiles.github_url is
  'Member-supplied GitHub URL. DB-constrained to http(s); still validate at the app layer before rendering as an href.';
comment on column public.profiles.website_url is
  'Member-supplied personal site URL. DB-constrained to http(s); still validate at the app layer before rendering as an href.';
