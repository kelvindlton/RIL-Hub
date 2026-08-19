import { createClient } from '@/utils/supabase/client';
import { WelfareRequest, Complaint } from '@/lib/mockDb';

export async function fetchWelfareRequests(): Promise<WelfareRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('welfare_requests')
    .select(`
      *,
      user:profiles(name)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching welfare requests:', error);
    return [];
  }

  return data.map((w) => ({
    id: w.id,
    userId: w.user_id,
    userName: w.user?.name || 'Member',
    type: w.type as 'welfare' | 'suggestion',
    title: w.title,
    content: w.content,
    priority: w.priority,
    status: w.status,
    date: new Date(w.created_at).toISOString().split('T')[0],
  }));
}

export async function submitWelfareRequest(
  type: 'welfare' | 'suggestion',
  title: string,
  content: string,
  priority: 'low' | 'medium' | 'high' | 'critical'
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to submit request');

  const { data, error } = await supabase
    .from('welfare_requests')
    .insert({
      user_id: user.id,
      type,
      title,
      content,
      priority,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateWelfareStatus(
  requestId: string,
  status: 'open' | 'in_progress' | 'resolved'
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('welfare_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching complaints:', error);
    return [];
  }

  return data.map((c) => ({
    id: c.id,
    trackingCode: c.tracking_code,
    title: c.title,
    content: c.content,
    priority: c.priority,
    status: c.status,
    date: new Date(c.created_at).toISOString().split('T')[0],
  }));
}

export async function submitComplaint(
  title: string,
  content: string,
  priority: 'low' | 'medium' | 'high' | 'critical'
): Promise<string> {
  const supabase = createClient();
  const trackingCode = `COMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const { error } = await supabase
    .from('complaints')
    .insert({
      tracking_code: trackingCode,
      title,
      content,
      priority,
      status: 'open',
    });

  if (error) throw new Error(error.message);
  return trackingCode;
}

export async function updateComplaintStatus(
  complaintId: string,
  status: 'open' | 'in_progress' | 'resolved'
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('complaints')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
