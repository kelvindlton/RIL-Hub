import { createClient } from '@/utils/supabase/client';
import { Event } from '@/lib/mockDb';

export async function fetchEvents(): Promise<Event[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_rsvps(user_id),
      event_checkins(user_id)
    `)
    .order('date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data.map((e) => {
    const rsvpUsers = (e.event_rsvps || []).map((r: any) => r.user_id);
    const checkedInUsers = (e.event_checkins || []).map((c: any) => c.user_id);
    const isRsvped = user ? rsvpUsers.includes(user.id) : false;

    return {
      id: e.id,
      title: e.title,
      description: e.description || '',
      location: e.location,
      date: e.date,
      time: e.time,
      category: e.category,
      rsvpCount: rsvpUsers.length,
      maxCapacity: e.max_capacity,
      isRsvped,
      qrCodeHash: e.qr_code_hash,
      checkedInUsers,
    };
  });
}

export async function toggleEventRsvp(eventId: string, isRsvped: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to RSVP');

  if (isRsvped) {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id });
    if (error) throw new Error(error.message);
  }
}

export async function checkInUserToEvent(
  eventId: string,
  userId: string,
  method: 'qr' | 'manual' = 'qr'
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('event_checkins')
    .insert({
      event_id: eventId,
      user_id: userId,
      method,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'User is already checked in to this event.' };
    }
    return { success: false, message: error.message };
  }

  // Award XP for event participation (+100 XP)
  await supabase.from('points_ledger').insert({
    user_id: userId,
    delta: 100,
    reason: 'Checked in to community event',
    ref_id: eventId,
  });

  return { success: true, message: 'Check-in verified successfully!' };
}

export async function createEvent(eventData: {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  category: string;
  maxCapacity: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const qrCodeHash = `qr_ril_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      date: eventData.date,
      time: eventData.time,
      category: eventData.category,
      max_capacity: eventData.maxCapacity,
      qr_code_hash: qrCodeHash,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
