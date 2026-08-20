# RIL Hub — Production Roadmap

**From front-end prototype → live, multi-tenant community platform.**

- **Backend/data platform:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Frontend:** existing Next.js 16 (App Router) + React 19 + Tailwind v4
- **v1 priority order:** Auth & Profile → Attendance → Feed → Directory → Admin
- **Must-haves baked in:** live real-time, image/file uploads, installable PWA

> ⚠️ **Next.js 16 caveat (from `AGENTS.md`):** this version has breaking changes vs. older docs. Before writing any new Next.js code (middleware, server actions, route handlers, caching, `cookies()`/`headers()` APIs), read the relevant guide in `node_modules/next/dist/docs/`. Several APIs below (e.g. async `cookies()`, middleware) changed across recent majors.

---

## 1. Current state (starting point)

A polished but **stateless front-end**. All data lives in `src/lib/mockDb.ts` and a single client-side React context (`src/context/AppContext.tsx`). No backend, no persistence, no real auth. `auth.ts` and `middleware.ts` are explicit stubs. State resets on every refresh; "real-time" is `setTimeout`-simulated; uploads/avatars are hardcoded paths; geofence check-in is client-only (spoofable).

**The work is: replace the mock context with a real, server-authoritative data layer — without throwing away the UI, which is largely reusable.**

---

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────┐
│ Client (Next.js App Router, React 19, PWA shell)         │
│  • Server Components fetch via Supabase server client     │
│  • Client Components mutate via Server Actions / RPC      │
│  • TanStack Query for client cache + optimistic updates   │
│  • Supabase Realtime subscriptions (feed, msgs, notifs)   │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
     @supabase/ssr (cookie session)   supabase-js (realtime/storage)
                │                          │
┌───────────────▼──────────────────────────▼───────────────┐
│ Supabase                                                  │
│  • Auth (email/password + Google OAuth)                   │
│  • Postgres + Row Level Security (the security boundary)  │
│  • Realtime (logical replication → WebSocket)             │
│  • Storage (avatars, post images) + image transforms      │
│  • Edge Functions (geofence verify, points engine, cron)  │
└───────────────────────────────────────────────────────────┘
```

**Key principles**
- **RLS is the security model.** Every table gets policies. The client talks to Postgres directly (via supabase-js) and is constrained by RLS — no trust in the browser.
- **Server-authoritative for anything gamed or sensitive:** points, streaks, check-in verification, role changes, ticket status. These run in DB functions / Edge Functions, never client-side.
- **Reuse the UI; replace the data source.** `AppContext` becomes a thin auth/session provider; data moves to per-feature hooks backed by TanStack Query + Supabase.

**New dependencies:** `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `zod` (validation), `next-pwa` or `@serwist/next` (PWA), `react-hook-form`. Dev: `vitest`, `@playwright/test`, `supabase` CLI.

---

## 3. Cross-cutting foundations (Phase 0)

These unblock everything else and should land first.

1. **Supabase project + local dev.** `supabase init`, Dockerized local stack, `supabase/migrations/` checked in. Environments: local → staging → prod.
2. **Env & secrets.** `.env.local` for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service role to the client.
3. **Supabase clients.** Three factory helpers: browser client, server client (`@supabase/ssr`, cookie-based, for Server Components/Actions), and an admin client (service role, server-only, for privileged ops).
4. **Data-access seam.** Introduce `src/data/*` modules (e.g. `posts.ts`, `events.ts`) so UI never imports `mockDb` again. This is the migration boundary — see §6.
5. **TanStack Query provider** + Supabase Realtime → query-invalidation bridge.
6. **Schema migration discipline.** All schema via SQL migrations; seed script (`supabase/seed.sql`) ports the existing mock users/posts/events so the demo data survives.
7. **CI scaffolding** (lint, typecheck, test, migration check) — see §9.

---

## 4. Data model (Postgres)

Direct translation of the existing TypeScript interfaces, normalized. (Types use enums; timestamps `timestamptz`.)

| Table | Notes |
|---|---|
| `profiles` | 1:1 with `auth.users.id`. role enum (`super_admin/admin/staff/member/alumni/partner`), name, email, phone, department, program_cohort, avatar_url, joined_date, birthday. Auto-created via `on_auth_user_created` trigger. |
| `skills`, `interests` + `profile_skills`, `profile_interests` | Many-to-many (enables the Directory "Skills Analysis" aggregation). Can start as `text[]` columns and normalize later. |
| `badges` + `profile_badges` | Awarded badges. |
| `points_ledger` | Append-only XP audit (`user_id, delta, reason, ref_id, created_at`). `profiles.points` is a derived/cached sum. Source of truth for gamification. |
| `posts` | author_id, content, image_url, tags `text[]`, is_pinned, created_at. Counts (likes/bookmarks/comments) derived via views or cached columns. |
| `post_likes`, `post_bookmarks` | (post_id, user_id) PK — replaces the `likedBy[]`/`bookmarkedBy[]` arrays. |
| `comments` | post_id, author_id, content, created_at. |
| `events` | title, description, location, starts_at, category enum, max_capacity, qr_code_hash. |
| `event_rsvps` | (event_id, user_id). rsvp_count = `count(*)`. |
| `event_checkins` | (event_id, user_id, method, checked_in_at) — unique on (event_id, user_id). |
| `hub_locations` | Geofence config (lat, lon, radius_m) — currently hardcoded in `geofence.ts`. Admin-editable. |
| `daily_checkins` | user_id, date, time, hub_id, **unique (user_id, date)** to prevent double check-in. Streak computed server-side. |
| `welfare_requests` | type enum (welfare/suggestion), title, content, priority, status, user_id. |
| `complaints` | tracking_code, title, content, priority, status — **anonymous** (no user_id, or hashed). |
| `channels`, `messages` | Real-time discussions (#general, #ai-lab, …). |
| `dm_threads`, `dm_messages` | Private DMs. |
| `notifications` | user_id, type, title, body, link, avatar_url, read, created_at — replaces simulated timers. |

**RLS sketch (representative):**
- `profiles`: everyone authenticated can read; users update only their own row; role column only writable by admins (enforced via a `SECURITY DEFINER` function).
- `posts`/`comments`: read = authenticated; insert = author = `auth.uid()`; pin = admin only.
- `daily_checkins`/`event_checkins`/`points_ledger`: **no direct client insert** — only via Edge Function / RPC that verifies geofence and writes server-side.
- `complaints`: insert allowed to authenticated but **no select of `user_id`**; resolver desk (admin) reads all.
- `messages`/`dm_messages`: members read channels they belong to; DM rows visible only to thread participants.

---

## 5. Phased delivery plan

Each phase ends with the module **fully real (persisted + RLS + tests)** and the corresponding mock removed. Effort estimates assume a small team (1–2 devs); treat as relative sizing, not commitments.

### Phase 0 — Foundations *(≈1 week)*
Everything in §3. Exit criteria: app boots against local Supabase, seed data loads, one trivial table reads through the new `src/data` seam, CI green.

### Phase 1 — Auth & Profile *(≈1.5–2 weeks)* — **priority #1**
- Wire `src/lib/auth.ts` to **Supabase Auth**: email/password + **Google OAuth** (the login page already has the Google button + "Guest" path).
- Replace `middleware.ts` stub with real **session refresh + route protection + role gating** (members blocked from `/reports`, etc.). Use `@supabase/ssr` middleware pattern (check the Next 16 docs first).
- `profiles` table + signup trigger + onboarding (set department, cohort, skills, avatar).
- **Real "Digital Passport" profile page** backed by DB (points, streak, badges from `points_ledger`/`profile_badges`).
- Replace the **persona switcher** with: real login for normal use, but keep an **admin-only "impersonate" tool** (service-role, audited) for testing — don't ship the open switcher to prod.
- Logout actually invalidates the session.
- **Avatar upload** (Storage) lands here (see §7.2) since it's profile-centric.

### Phase 2 — Attendance *(≈2 weeks)* — **priority #2**
- Move `HUB_LOCATIONS` → `hub_locations` table (admin-editable).
- **Server-side geofence verification:** the daily check-in posts GPS coords to an **Edge Function** that runs the Haversine check server-side, enforces the `(user_id, date)` unique constraint, writes `daily_checkins`, and awards points via the points engine. Client no longer self-certifies. Keep `DailyCheckInModal`'s UX (states, confetti) but point it at the RPC.
  - *Anti-spoof note:* browser GPS is inherently spoofable. Mitigations: server timestamp, rate-limit, optional pairing of geo **+** event QR, and flag improbable jumps. Document residual risk; full hardening (device attestation) is post-v1.
- **Event QR check-in:** real `qr_code_hash` validation server-side; admin manual registry writes to `event_checkins`.
- **Streak engine** as a DB function (recompute on each check-in; "yesterday → +1, gap → reset").
- Gamification (`+50 XP`) moves server-side via `points_ledger`.

### Phase 3 — Feed *(≈2 weeks)* — **priority #3**
- `posts`/`comments`/`post_likes`/`post_bookmarks` persisted; counts via views.
- Create post (with **image upload**, §7.2), like, bookmark, comment — all real, with **optimistic UI** via TanStack Query.
- **Real-time feed** (§7.1): new posts/comments stream in via Supabase Realtime.
- **Birthday auto-post** + **notifications** move to a **scheduled Edge Function (pg_cron)** that runs daily server-side, instead of the on-mount client scan.
- Spotlights = a real query (e.g. top `points_ledger` gainers / pinned posts).
- Post XP (`+10`/`+5`) server-side.

### Phase 4 — Directory *(≈1 week)* — **priority #4**
- Registry grid reads `profiles`; pagination/search server-side.
- **Skills Analysis** = aggregation query over `profile_skills` (counts, top skills, gaps).
- Profile drawer reuses the Phase 1 passport.

### Phase 5 — Admin side *(≈2.5–3 weeks)* — **priority #5**
- **Reports/Analytics:** real metrics (attendance trends, engagement, demographics) via SQL aggregations / Postgres views; charts fed from live data; **CSV/spreadsheet export** server-generated.
- **Welfare Resolver Desk:** admin reads all `welfare_requests` + `complaints`, updates status (triggers a notification to the requester). Member-facing welfare submission + **anonymous complaint box** (tracking-code lookup) also land here.
- **Event scheduling** (admin create/edit events).
- **Manual attendance registry** (admin check-in members).
- **User/role management** + the audited impersonation tool from Phase 1.
- Role-gated routes verified end-to-end.

### Post-v1 backlog (explicitly deferred by your scope)
- **Messages** (channels + DMs) — full real-time chat. (Realtime infra from Phase 3 makes this mostly UI + schema work.)
- Web **push notifications** + transactional **email** (welcome, ticket updates, event reminders).
- Native mobile (if PWA proves insufficient for geofencing reliability).
- Advanced search, content moderation, audit log UI, partner-specific views.

---

## 6. Migration strategy (mock → real, without a big-bang rewrite)

1. **Introduce the `src/data/` seam first** (Phase 0). Each module exports the same shapes the UI already consumes, initially backed by `mockDb`.
2. **Flip one module at a time.** Swap a `src/data/*` implementation from mock → Supabase. UI components don't change. This makes each phase independently shippable and reversible.
3. **`AppContext` shrinks** to: current session/user + global notification subscription. Per-feature state moves to TanStack Query hooks. The big mutator bag (`addPost`, `checkInUser`, …) becomes thin wrappers over `src/data` calls / server actions.
4. **Seed parity.** Port `initialProfiles/Events/Posts/...` into `supabase/seed.sql` so staging/demo looks identical to today.
5. **Delete `mockDb.ts`** only when the last consumer is migrated (end of Phase 5).

---

## 7. Must-have capabilities (woven through the phases)

### 7.1 Real-time (replaces simulated `setTimeout` feed)
- Supabase **Realtime** channels on `notifications` (per-user), `posts`/`comments` (feed), later `messages`/`dm_messages`.
- Bridge to TanStack Query: on realtime event → `queryClient.invalidateQueries` or patch cache.
- The current fake notification timers in `AppContext` are removed in Phase 3.

### 7.2 Image/file uploads (replaces hardcoded `/avatars/*`)
- Supabase **Storage** buckets: `avatars` (public-read, owner-write) and `post-images`.
- Client-side resize/compress before upload; store `*_url` on the row; use Supabase image transformations for thumbnails.
- RLS/storage policies: users write only their own avatar; post images tied to author.
- Lands in Phase 1 (avatars) and Phase 3 (post images).

### 7.3 PWA / mobile (important for geofenced check-in on phones)
- Add `manifest.json`, icons, and a service worker (`@serwist/next` recommended for App Router; verify against Next 16 docs).
- **Installable** ("Add to Home Screen"), offline app shell, cached static assets.
- Geolocation permission UX tuned for installed PWA; ensure the check-in flow works from a home-screen launch.
- Sets up the delivery path for **web push** later (deferred capability).
- Lands as a dedicated slice right after Phase 1 (so the attendance/check-in work in Phase 2 is validated on a real installed mobile PWA).

---

## 8. Security checklist
- RLS **enabled on every table**, default-deny; policies tested (§9).
- Service-role key server-only; never in a `NEXT_PUBLIC_*` var or client bundle.
- All gamified/sensitive writes server-authoritative (points, streaks, check-ins, role changes, ticket status).
- Input validation with `zod` at every mutation boundary.
- Anonymous complaints truly anonymous (no `user_id` leak via RLS or logs).
- Rate-limiting on check-in and post endpoints.
- OAuth redirect allow-list; secure cookie flags; CSRF-safe server actions.
- Audit log for admin actions (role change, impersonation, ticket resolution).

## 9. Testing, CI/CD, deployment
- **Unit:** Vitest for `src/data`, geofence math, points/streak functions.
- **RLS policy tests:** SQL/pgTAP or scripted supabase-js tests asserting cross-user access is denied.
- **E2E:** Playwright for the core loops (login, check-in, post, RSVP, admin resolve) against a seeded local Supabase.
- **CI (GitHub Actions):** lint + typecheck + `supabase db lint` + migration apply on a throwaway DB + unit + E2E. Block merge on red.
- **CD:** Vercel for the Next app (preview deploy per PR); Supabase migrations promoted via `supabase db push` per environment. Staging mirrors prod.

## 10. Risks & open decisions
- **GPS spoofing** on geofenced check-in — accept residual risk for v1; document mitigations (§5 Phase 2). Decide later if device attestation / QR-pairing is required.
- **Next.js 16 API drift** — budget time to read `node_modules/next/dist/docs/` for middleware, `cookies()`, caching, and PWA/service-worker compatibility before each foundational piece.
- **Realtime cost/scale** — fine at community scale; revisit if channels grow large.
- **Points as cached column vs. live sum** — start cached (updated by ledger trigger); reconcile job for safety.
- **Persona switcher** — replace with audited admin impersonation; do not ship open switching to prod.
- **Open question:** expected user count & number of physical hubs (affects geofence config and Realtime sizing).

## 11. Sequencing summary
```
Phase 0  Foundations (Supabase, clients, data seam, CI)        ~1 wk
Phase 1  Auth & Profile (+ avatar upload)                      ~1.5–2 wks
   ↳     PWA slice (installable + offline shell)               ~0.5 wk
Phase 2  Attendance (server geofence, QR, streaks)             ~2 wks
Phase 3  Feed (posts/likes/comments, realtime, uploads, cron)  ~2 wks
Phase 4  Directory (registry, skills analysis)                 ~1 wk
Phase 5  Admin (reports, resolver, scheduling, user mgmt)      ~2.5–3 wks
─────────────────────────────────────────────────────────────────────
v1 launch target                                          ~10–12 wks
Post-v1: Messages (realtime chat), push/email, native mobile
```
