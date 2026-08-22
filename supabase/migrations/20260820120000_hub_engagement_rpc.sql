-- ────────────────────────────────────────────────────────────────────────────
-- Hub Engagement chart data — aggregate ONLY.
-- Members can read their OWN daily_checkins under RLS but not other members',
-- so a hub-wide chart can't be built client-side. This SECURITY DEFINER
-- function runs as owner and returns per-day COUNTS for the trailing 7 days —
-- date + count only, never user_id or any per-person data.
-- Mirrors the record_daily_checkin grant model: authenticated may EXECUTE.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.hub_engagement_last_7_days()
returns table(day date, checkins integer)
language sql
security definer
set search_path = public
as $$
  -- One row per day for the last 7 days (today + 6 back). Zero-activity days are
  -- preserved via the LEFT JOIN so the caller always gets a full 7-day series.
  -- Single hub today ('ril-main'); to scope per-hub later, add a
  --   p_hub_id text default null
  -- parameter and AND it into the join: (p_hub_id is null or dc.hub_id = p_hub_id).
  select d.day, count(dc.id)::int as checkins
  from (
    select (current_date - g)::date as day
    from generate_series(0, 6) as g
  ) d
  left join public.daily_checkins dc on dc.date = d.day
  group by d.day
  order by d.day;
$$;

-- Aggregate is safe for any logged-in member; individual rows are never exposed.
revoke all on function public.hub_engagement_last_7_days() from public, anon;
grant execute on function public.hub_engagement_last_7_days() to authenticated;
