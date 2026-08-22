-- ────────────────────────────────────────────────────────────────────────────
-- Daily check-in: server-authoritative RPC that owns streak, ledger and
-- balance. points_ledger stays locked to clients — only this SECURITY DEFINER
-- function writes it. Daily check-in writes go through the RPC ONLY (there is
-- intentionally NO direct client INSERT policy on daily_checkins).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Direct client INSERT policy — event_checkins only ───────────────────────
--    (That flow has no RPC yet. daily_checkins intentionally has NO direct
--     INSERT policy: all daily writes must go through record_daily_checkin.)
create policy "event_checkins_insert_own"
  on public.event_checkins for insert to authenticated
  with check (auth.uid() = user_id);

-- 2. Server-authoritative daily check-in ─────────────────────────────────────
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

  -- Ledger (+50) — ONLY the RPC writes here (table stays locked to clients)
  insert into public.points_ledger (user_id, delta, reason, ref_id)
    values (v_user_id, 50, 'Daily Hub Attendance Check-in', v_checkin.id::text);

  -- Keep the denormalised balance + streak on the profile in sync
  update public.profiles
     set points = points + 50,
         streak = v_streak,
         updated_at = now()
   where id = v_user_id
   returning points into v_points;

  select count(*) into v_total from public.daily_checkins where user_id = v_user_id;

  return json_build_object(
    'success', true, 'already', false,
    'streak', v_streak, 'total_days', v_total, 'points', v_points,
    'check_in_time', to_char(v_checkin.time, 'HH24:MI')
  );
end;
$$;

-- 3. Grants — authenticated may EXECUTE; nobody gets direct ledger INSERT ─────
revoke all on function public.record_daily_checkin(text) from public, anon;
grant execute on function public.record_daily_checkin(text) to authenticated;
