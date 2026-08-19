import { createClient } from '@/utils/supabase/client';
import { checkGeofence } from '@/lib/geofence';

export interface DailyCheckInStatus {
  checkedInToday: boolean;
  checkInTime?: string;
  streak: number;
  totalDays: number;
}

export async function fetchDailyCheckInStatus(userId: string): Promise<DailyCheckInStatus> {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: todayCheckin } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', todayStr)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak')
    .eq('id', userId)
    .single();

  const { count } = await supabase
    .from('daily_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    checkedInToday: !!todayCheckin,
    checkInTime: todayCheckin?.time ? todayCheckin.time.substring(0, 5) : undefined,
    streak: profile?.streak || 0,
    totalDays: count || 0,
  };
}

export async function recordDailyCheckIn(userId: string, latitude?: number, longitude?: number) {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let hubId = 'ril-main';
  if (latitude !== undefined && longitude !== undefined) {
    const geo = checkGeofence(latitude, longitude);
    if (geo.within) {
      hubId = geo.hub.id;
    }
  }

  // Fetch current user streak
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak')
    .eq('id', userId)
    .single();

  const newStreak = (profile?.streak || 0) + 1;

  const { data, error } = await supabase
    .from('daily_checkins')
    .insert({
      user_id: userId,
      hub_id: hubId,
      date: todayStr,
      time: timeStr,
      points_awarded: 50,
      streak_count: newStreak,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Already checked in today.' };
    }
    throw new Error(error.message);
  }

  // Update profile streak
  await supabase
    .from('profiles')
    .update({ streak: newStreak, updated_at: new Date().toISOString() })
    .eq('id', userId);

  // Award XP to points ledger (+50 XP)
  await supabase.from('points_ledger').insert({
    user_id: userId,
    delta: 50,
    reason: 'Daily Hub Attendance Check-in',
    ref_id: data.id,
  });

  return { success: true, checkin: data };
}
