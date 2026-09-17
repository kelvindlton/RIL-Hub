import { createClient } from '@/utils/supabase/client';

export interface DailyCheckInStatus {
  checkedInToday: boolean;
  checkInTime?: string;
  streak: number;
  totalDays: number;
}

/**
 * Machine-readable rejection codes from record_daily_checkin. The server always
 * pairs one of these with a human `message`, so callers can pick tailored copy
 * instead of falling back to a generic failure.
 */
export type CheckInRejectReason =
  | 'already'       // already checked in today (idempotent no-op)
  | 'no_position'   // no coordinates reached the server
  | 'bad_position'  // coordinates outside valid lat/lng range
  | 'no_hubs'       // hub_locations is empty
  | 'inaccurate'    // GPS fix too fuzzy to place inside or outside
  | 'outside';      // verified position is beyond the hub radius

export interface RecordCheckInResult {
  success: boolean;
  message?: string;
  reason?: CheckInRejectReason;
  streak?: number;
  totalDays?: number;
  points?: number;
  checkInTime?: string;
  /** Server-computed metres from the resolved hub. */
  distanceM?: number;
  /** Name of the hub the server resolved as nearest. */
  hubName?: string;
  /** That hub's allowed radius, from the DB rather than a client constant. */
  radiusM?: number;
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
  latitude: number,
  longitude: number,
  accuracyM?: number,
): Promise<RecordCheckInResult> {
  const supabase = createClient();

  // Coordinates go to the server as-is. The RPC resolves the nearest hub, runs
  // the geofence and decides eligibility — the client no longer names its own
  // hub, and no local geofence result is trusted or even consulted here.
  const { data, error } = await supabase.rpc('record_daily_checkin', {
    p_lat: latitude,
    p_lng: longitude,
    p_accuracy_m: accuracyM ?? null,
  });

  if (error || !data) {
    return { success: false, message: error?.message ?? 'No response from server.' };
  }

  return {
    success: data.success,
    message: data.message,
    reason: data.reason,
    streak: data.streak,
    totalDays: data.total_days,
    points: data.points,
    checkInTime: data.check_in_time,
    distanceM: data.distance_m ?? undefined,
    hubName: data.hub_name ?? undefined,
    radiusM: data.radius_m ?? undefined,
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
