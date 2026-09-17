-- ────────────────────────────────────────────────────────────────────────────
-- 20260901000000_checkin_server_geofence.sql
--
-- Move daily check-in eligibility from the client to the server.
--
-- BEFORE: record_daily_checkin(p_hub_id text) accepted the hub the CLIENT
--   named, then awarded +50 XP and a streak day with no location check at all.
--   Anyone able to call the RPC — a fetch from a phone anywhere on earth — got
--   the points. The geofence lived only in src/lib/geofence.ts, i.e. in code
--   the caller controls and can simply decline to run.
--
-- AFTER: record_daily_checkin(p_lat, p_lng, p_accuracy_m) takes the reported
--   position, resolves the NEAREST hub itself from public.hub_locations, and
--   awards the check-in only when that point falls inside the hub's radius_m.
--   The client no longer names its own hub. Every rejection returns a
--   machine-readable `reason` alongside a human `message`, so the UI can
--   explain what actually happened instead of showing a generic failure.
--
-- LIMITATION, stated plainly: the coordinates still arrive from the client and
--   can be faked. This raises the bar from "call the endpoint" to "deliberately
--   lie about your position", and it records the claimed position for
--   after-the-fact anomaly detection. It does not make attendance
--   tamper-proof. That needs a hub-side secret a member must be physically
--   present to read (rotating QR or passcode), which is separate work.
--
-- Idempotent: create-or-replace throughout, `add column if not exists`, and
-- the ril-dallas delete is a no-op once the row is gone.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 0. Remove scaffold hub data ─────────────────────────────────────────────
-- 'ril-dallas' (RIL Dallas Hub, 32.7767 / -96.7970, 200m) came from the
-- template seed, not from RIL. It matters more now than it did before: the
-- server resolves the NEAREST hub, so a fictional hub is a fictional place to
-- be awarded attendance.
--
-- daily_checkins.hub_id references hub_locations(id) with no ON DELETE action,
-- so a bare DELETE would ABORT this entire migration if any check-in row still
-- pointed at it. Count first and report rather than fail.
do $$
declare
  v_refs int;
begin
  select count(*) into v_refs
    from public.daily_checkins
   where hub_id = 'ril-dallas';

  if v_refs > 0 then
    raise notice
      'KEPT hub ril-dallas: % daily_checkins row(s) still reference it. Reassign or clear those rows, then run: delete from public.hub_locations where id = ''ril-dallas'';',
      v_refs;
  else
    delete from public.hub_locations where id = 'ril-dallas';
  end if;
end $$;

-- ── 1. Audit columns: record what the client claimed ────────────────────────
-- Stored so a spoofed check-in leaves a trace worth auditing later, even though
-- it cannot be blocked at write time.
alter table public.daily_checkins
  add column if not exists reported_lat numeric(10, 7),
  add column if not exists reported_lng numeric(10, 7),
  add column if not exists accuracy_m   numeric(8, 2),
  add column if not exists distance_m   numeric(10, 2);

comment on column public.daily_checkins.reported_lat is
  'Latitude the client claimed at check-in. Client-supplied: evidence, not proof.';
comment on column public.daily_checkins.reported_lng is
  'Longitude the client claimed at check-in. Client-supplied: evidence, not proof.';
comment on column public.daily_checkins.accuracy_m is
  'Accuracy radius the device reported for that fix, in metres. Null if unknown.';
comment on column public.daily_checkins.distance_m is
  'Server-computed metres from the awarded hub at check-in time.';

-- ── 2. Distance helper ──────────────────────────────────────────────────────
-- Plain-SQL haversine rather than PostGIS/earthdistance: this migration must
-- not depend on an extension whose availability was never verified here.
create or replace function public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql
immutable
parallel safe
set search_path = public
as $$
  -- least(1, ...) guards asin() against floating-point overshoot past 1.
  select 2 * 6371000 * asin(least(1, sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- Internal helper only. record_daily_checkin is SECURITY DEFINER and runs as
-- the owner, so it needs no grant here. CREATE FUNCTION grants EXECUTE to
-- PUBLIC by default, hence the explicit revoke.
revoke all on function public.haversine_m(
  double precision, double precision, double precision, double precision
) from public, anon, authenticated;

-- ── 3. Retire the coordinate-free signature ─────────────────────────────────
-- Load-bearing. `create or replace function` with a DIFFERENT argument list
-- creates an OVERLOAD, not a replacement — without this drop, the old
-- record_daily_checkin(text) stays callable and the entire migration is
-- cosmetic: clients could keep awarding themselves points with no location.
drop function if exists public.record_daily_checkin(text);

-- ── 4. Server-authoritative check-in ───────────────────────────────────────
create or replace function public.record_daily_checkin(
  p_lat        double precision,
  p_lng        double precision,
  p_accuracy_m double precision default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today   date := current_date;
  v_last    record;
  v_hub     record;
  v_streak  int;
  v_total   int;
  v_points  int;
  v_checkin public.daily_checkins%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Idempotency runs FIRST, ahead of any geofence work: someone who already
  -- checked in today must never be told they are standing in the wrong place.
  select * into v_checkin
    from public.daily_checkins
   where user_id = v_user_id and date = v_today;
  if found then
    select count(*) into v_total from public.daily_checkins where user_id = v_user_id;
    select points  into v_points from public.profiles where id = v_user_id;
    return json_build_object(
      'success', false, 'already', true, 'reason', 'already',
      'message', 'You already checked in today at '
                 || to_char(v_checkin.time, 'HH24:MI') || '.',
      'streak', v_checkin.streak_count, 'total_days', v_total, 'points', v_points,
      'check_in_time', to_char(v_checkin.time, 'HH24:MI')
    );
  end if;

  -- No position → nothing to verify, so nothing is awarded.
  if p_lat is null or p_lng is null then
    return json_build_object(
      'success', false, 'reason', 'no_position',
      'message', 'We could not read your location, so your attendance was not recorded.'
    );
  end if;

  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return json_build_object(
      'success', false, 'reason', 'bad_position',
      'message', 'Your device reported an impossible location. Please retry.'
    );
  end if;

  -- The nearest hub is resolved HERE, from the table. The client used to name
  -- its own hub, which was itself a spoofing vector.
  select h.id, h.name, h.radius_m,
         public.haversine_m(p_lat, p_lng,
                            h.latitude::double precision,
                            h.longitude::double precision) as distance_m
    into v_hub
    from public.hub_locations h
   order by distance_m asc
   limit 1;

  if not found then
    return json_build_object(
      'success', false, 'reason', 'no_hubs',
      'message', 'No hub locations are configured. Please contact an administrator.'
    );
  end if;

  -- A fix fuzzier than radius_m + 50m cannot place anyone inside or outside
  -- with confidence, so it is refused rather than guessed at. The tolerance
  -- scales per hub instead of assuming one radius for every site.
  if p_accuracy_m is not null and p_accuracy_m > v_hub.radius_m + 50 then
    return json_build_object(
      'success', false, 'reason', 'inaccurate',
      'message', 'Your location is only accurate to ' || round(p_accuracy_m)::text
                 || 'm, which is too imprecise to confirm you are at the hub. '
                 || 'Step outside or near a window and retry.',
      'hub_name', v_hub.name,
      'radius_m', v_hub.radius_m,
      'accuracy_m', round(p_accuracy_m)::int
    );
  end if;

  if v_hub.distance_m > v_hub.radius_m then
    return json_build_object(
      'success', false, 'reason', 'outside',
      'message', format('You are %sm from %s. You must be within %sm to check in.',
                        round(v_hub.distance_m)::text, v_hub.name, v_hub.radius_m::text),
      'hub_name', v_hub.name,
      'distance_m', round(v_hub.distance_m)::int,
      'radius_m', v_hub.radius_m
    );
  end if;

  -- ── Eligible from here down. Streak logic is unchanged from the previous
  -- version: look at the most recent row BEFORE today.
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

  -- hub_id is the hub the SERVER derived, never one the client asked for.
  begin
    insert into public.daily_checkins (
      user_id, hub_id, date, points_awarded, streak_count,
      reported_lat, reported_lng, accuracy_m, distance_m
    ) values (
      v_user_id, v_hub.id, v_today, 50, v_streak,
      p_lat, p_lng, p_accuracy_m, v_hub.distance_m
    )
    returning * into v_checkin;
  exception when unique_violation then
    -- Concurrent double-submit: the other transaction won. Report its truth.
    select * into v_checkin from public.daily_checkins
      where user_id = v_user_id and date = v_today;
    select count(*) into v_total from public.daily_checkins where user_id = v_user_id;
    select points  into v_points from public.profiles where id = v_user_id;
    return json_build_object(
      'success', false, 'already', true, 'reason', 'already',
      'message', 'You already checked in today at '
                 || to_char(v_checkin.time, 'HH24:MI') || '.',
      'streak', v_checkin.streak_count, 'total_days', v_total, 'points', v_points,
      'check_in_time', to_char(v_checkin.time, 'HH24:MI')
    );
  end;

  -- Ledger (+50). Its AFTER INSERT trigger is the SOLE writer of
  -- profiles.points and applies the delta synchronously before we continue.
  insert into public.points_ledger (user_id, delta, reason, ref_id)
    values (v_user_id, 50, 'Daily Hub Attendance Check-in', v_checkin.id::text);

  -- Sync ONLY streak + updated_at. points is deliberately NOT written here —
  -- writing it was the double-count bug fixed in 20260827000000. Bracketed with
  -- the bypass flag so this stays a recognised trusted writer.
  perform set_config('app.bypass_role_points_guard', 'true', true);
  update public.profiles
     set streak = v_streak,
         updated_at = now()
   where id = v_user_id
   returning points into v_points;   -- reflects the +50 the ledger trigger applied
  perform set_config('app.bypass_role_points_guard', 'false', true);

  select count(*) into v_total from public.daily_checkins where user_id = v_user_id;

  return json_build_object(
    'success', true, 'already', false,
    'streak', v_streak, 'total_days', v_total, 'points', v_points,
    'check_in_time', to_char(v_checkin.time, 'HH24:MI'),
    'hub_name', v_hub.name,
    'distance_m', round(v_hub.distance_m)::int
  );
end;
$$;

-- ── 5. Grants — the new signature only ──────────────────────────────────────
revoke all on function public.record_daily_checkin(
  double precision, double precision, double precision
) from public, anon;

grant execute on function public.record_daily_checkin(
  double precision, double precision, double precision
) to authenticated;
