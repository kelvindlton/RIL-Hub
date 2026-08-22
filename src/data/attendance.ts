import { createClient } from '@/utils/supabase/client';
import { checkGeofence } from '@/lib/geofence';

export interface DailyCheckInStatus {
  checkedInToday: boolean;
  checkInTime?: string;
  streak: number;
  totalDays: number;
}

export interface RecordCheckInResult {
  success: boolean;
  message?: string;
  streak?: number;
  totalDays?: number;
  points?: number;
  checkInTime?: string;
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

export async function recordDailyCheckIn(
  _userId: string,          // kept for call-site compatibility; the RPC uses auth.uid()
  latitude?: number,
  longitude?: number,
): Promise<RecordCheckInResult> {
  const supabase = createClient();

  // Client geofence is still enforced in the modal; resolve the hub for logging.
  let hubId = 'ril-main';
  if (latitude !== undefined && longitude !== undefined) {
    const geo = checkGeofence(latitude, longitude);
    if (geo.within) hubId = geo.hub.id;
  }

  // Idempotency, streak, ledger (+50) and profile balance are all handled
  // atomically inside the SECURITY DEFINER RPC. No direct table writes here.
  const { data, error } = await supabase.rpc('record_daily_checkin', { p_hub_id: hubId });

  if (error || !data) {
    return { success: false, message: error?.message ?? 'No response from server.' };
  }

  return {
    success: data.success,
    message: data.message,
    streak: data.streak,
    totalDays: data.total_days,
    points: data.points,
    checkInTime: data.check_in_time,
  };
}

// ─── Hub engagement (aggregate, RPC-backed) ─────────────────────────────────

export interface HubEngagementDay {
  date: string;  // YYYY-MM-DD (UTC)
  count: number; // number of check-ins that day, hub-wide
}

// Reads per-day aggregate counts for the trailing 7 days from the
// hub_engagement_last_7_days() SECURITY DEFINER RPC. The RPC returns counts
// only (no user_id / per-person data), so a member can render the hub-wide
// chart without being able to read other members' check-in rows directly.
export async function fetchHubEngagementLast7Days(): Promise<HubEngagementDay[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('hub_engagement_last_7_days');
  if (error || !data) return [];
  return (data as { day: string; checkins: number }[]).map(r => ({
    date: r.day,
    count: r.checkins ?? 0,
  }));
}
