-- ────────────────────────────────────────────────────────────────────────────
-- 20260827000000_profile_points_guard_and_checkin_fix.sql
--
-- A. Fix double-counted check-in points. The points_ledger AFTER INSERT trigger
--    (handle_points_ledger_insert) is the SINGLE writer of profiles.points;
--    record_daily_checkin no longer also adds +50 directly on top of it.
-- B. Enforce that role/points change only via trusted paths. A BEFORE UPDATE
--    guard on profiles rejects direct role/points changes, EXCEPT:
--      - trusted server triggers, which set a txn-local bypass flag, and
--      - admins (is_admin()), so "Admins can update any profile" keeps working
--        with no extra server-side plumbing.
-- C. One-time reconciliation: rebuild every profile's points from the sum of its
--    points_ledger deltas (the source of truth), unwinding historical drift.
--
-- Idempotent: create-or-replace throughout; the reconciliation is convergent
-- (re-running resolves points to the same ledger-derived total).
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Guard: block direct role/points changes unless trusted ────────────────
create or replace function public.guard_profile_role_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Trusted server triggers set this txn-local flag via set_config(..., true).
  -- Admins are exempt (is_admin() is SECURITY DEFINER) so the existing
  -- "Admins can update any profile" policy needs no new plumbing.
  if coalesce(current_setting('app.bypass_role_points_guard', true), 'false') = 'true'
     or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Direct role change is not permitted'
      using errcode = '42501';
  end if;

  if new.points is distinct from old.points then
    raise exception 'Direct points change is not permitted; points are written only via points_ledger'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace trigger guard_profile_role_points_update
  before update on public.profiles
  for each row execute function public.guard_profile_role_points();

-- ── 2. Ledger trigger = the ONE writer of profiles.points ────────────────────
-- Sets the bypass flag around its own write and resets it afterwards
-- (belt-and-suspenders — the flag is already txn-local). Trigger binding
-- on_points_ledger_insert (AFTER INSERT on points_ledger) is unchanged.
create or replace function public.handle_points_ledger_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_role_points_guard', 'true', true);   -- txn-local
  update public.profiles
     set points = points + new.delta
   where id = new.user_id;
  perform set_config('app.bypass_role_points_guard', 'false', true);  -- reset
  return new;
end;
$$;

-- ── 3. Check-in RPC: drop the redundant +50; keep streak/updated_at only ─────
create or replace function public.record_daily_checkin(p_hub_id text default 'ril-main')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today   date := current_date;
  v_last    record;
  v_streak  int;
  v_total   int;
  v_points  int;
  v_checkin public.daily_checkins%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Idempotency: already checked in today → no-op, return current truth
  select * into v_checkin
    from public.daily_checkins
    where user_id = v_user_id and date = v_today;
  if found then
    select count(*) into v_total from public.daily_checkins where user_id = v_user_id;
    select points  into v_points from public.profiles where id = v_user_id;
    return json_build_object(
      'success', false, 'already', true, 'message', 'Already checked in today.',
      'streak', v_checkin.streak_count, 'total_days', v_total, 'points', v_points,
      'check_in_time', to_char(v_checkin.time, 'HH24:MI')
    );
  end if;

  -- Correct streak: look at the most recent row BEFORE today
  select date, streak_count into v_last
    from public.daily_checkins
    where user_id = v_user_id and date < v_today
    order by date desc
    limit 1;

  if not found then
    v_streak := 1;                       -- no history → start at 1
  elsif v_last.date = v_today - 1 then
    v_streak := v_last.streak_count + 1; -- exactly yesterday → increment
  else
    v_streak := 1;                       -- gap → reset to 1
  end if;

  -- Insert today's check-in (handle the concurrent double-submit race)
  begin
    insert into public.daily_checkins (user_id, hub_id, date, points_awarded, streak_count)
      values (v_user_id, coalesce(p_hub_id, 'ril-main'), v_today, 50, v_streak)
      returning * into v_checkin;
  exception when unique_violation then
    select * into v_checkin from public.daily_checkins
      where user_id = v_user_id and date = v_today;
    select count(*) into v_total from public.daily_checkins where user_id = v_user_id;
    select points  into v_points from public.profiles where id = v_user_id;
    return json_build_object(
      'success', false, 'already', true, 'message', 'Already checked in today.',
      'streak', v_checkin.streak_count, 'total_days', v_total, 'points', v_points,
      'check_in_time', to_char(v_checkin.time, 'HH24:MI')
    );
  end;

  -- Ledger (+50) — the ledger trigger is the SOLE writer of profiles.points and
  -- applies the +50 (bypassing the guard) synchronously before we continue.
  insert into public.points_ledger (user_id, delta, reason, ref_id)
    values (v_user_id, 50, 'Daily Hub Attendance Check-in', v_checkin.id::text);

  -- Sync ONLY streak + updated_at (streak is not ledger-derived). points is
  -- intentionally NOT written here — writing it was the double-count bug.
  -- Bracket with the bypass flag so this stays a recognised trusted writer, and
  -- reset to 'false' afterwards (belt-and-suspenders; flag is txn-local anyway).
  perform set_config('app.bypass_role_points_guard', 'true', true);
  update public.profiles
     set streak = v_streak,
         updated_at = now()
   where id = v_user_id
   returning points into v_points;  -- reflects the +50 the ledger trigger already applied
  perform set_config('app.bypass_role_points_guard', 'false', true);

  select count(*) into v_total from public.daily_checkins where user_id = v_user_id;

  return json_build_object(
    'success', true, 'already', false,
    'streak', v_streak, 'total_days', v_total, 'points', v_points,
    'check_in_time', to_char(v_checkin.time, 'HH24:MI')
  );
end;
$$;

-- ── 4. One-time reconciliation: rebuild balances from the ledger ─────────────
-- points_ledger is the source of truth. Every profile whose cached points
-- differ from the sum of its ledger deltas is corrected. Profiles with no
-- ledger rows resolve to 0 (all real points originate from ledger inserts;
-- seed.sql seeds no points, profiles default to 0). This unwinds the historical
-- 100-per-check-in double-count down to the intended 50 (one +50 ledger row per
-- check-in). Wrapped in a DO block so the bypass flag and the UPDATE share one
-- execution context; only rows that actually differ are touched.
do $$
begin
  perform set_config('app.bypass_role_points_guard', 'true', true);

  update public.profiles p
     set points = coalesce(l.total, 0),
         updated_at = now()
    from (
      select pr.id, coalesce(sum(pl.delta), 0)::int as total
        from public.profiles pr
        left join public.points_ledger pl on pl.user_id = pr.id
       group by pr.id
    ) l
   where p.id = l.id
     and p.points is distinct from coalesce(l.total, 0);

  perform set_config('app.bypass_role_points_guard', 'false', true);
end $$;




