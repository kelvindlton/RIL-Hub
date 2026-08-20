'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { WelfareCardSkeleton } from '@/components/common/Skeletons';
import {
  HeartHandshake,
  ShieldAlert,
  Send,
  CheckCircle,
  FileText,
  Lock,
  Inbox,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'resolved': return 'bg-green-100 text-green-700 border border-green-200';
    case 'in_progress': return 'bg-orange-100 text-orange-700 border border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

// --- TAB: Welfare & Suggestions Form ---
function WelfareTab() {
  const { welfareRequests, currentUser, isLoading, isError, errorMessage, refetchData, addWelfareRequest } = useApp();

  const [welfareCategory, setWelfareCategory] = useState<'welfare' | 'suggestion'>('welfare');
  const [welfarePriority, setWelfarePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [welfareTitle, setWelfareTitle] = useState('');
  const [welfareContent, setWelfareContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myWelfareRequests = welfareRequests.filter(req => req.userId === currentUser.id);

  const handleWelfareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!welfareTitle.trim() || !welfareContent.trim()) {
      setFormError('Please provide both a subject and details for your request.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addWelfareRequest(welfareCategory, welfareTitle.trim(), welfareContent.trim(), welfarePriority);
      setFormSuccess('Welfare/Suggestion ticket submitted! Administrators have been notified.');
      setWelfareTitle('');
      setWelfareContent('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

      {/* File Request Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <HeartHandshake className="w-5 h-5 text-brand-blue" />
          <h3 className="font-extrabold text-sm text-gray-900">Request Welfare / Submit Suggestion</h3>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleWelfareSubmit} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Ticket Type</label>
              <select
                value={welfareCategory}
                onChange={(e) => setWelfareCategory(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
              >
                <option value="welfare">Welfare Support Request</option>
                <option value="suggestion">Hub Suggestions/Feedback</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Priority</label>
              <select
                value={welfarePriority}
                onChange={(e) => setWelfarePriority(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical/Welfare Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={welfareTitle}
              onChange={(e) => setWelfareTitle(e.target.value)}
              placeholder="e.g. Subsidy for model training, keyboard replacement request..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
              Elaborate Request Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={welfareContent}
              onChange={(e) => setWelfareContent(e.target.value)}
              placeholder="Describe what resources, support, or adjustments you require..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-blue font-medium text-gray-800 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-blue text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
          </button>
        </form>
      </div>

      {/* My Submitted Tickets */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <FileText className="w-5 h-5 text-brand-blue" />
          <h3 className="font-extrabold text-sm text-gray-900">My Registered Submissions</h3>
        </div>

        {isLoading && welfareRequests.length === 0 ? (
          <div className="space-y-3">
            <WelfareCardSkeleton />
            <WelfareCardSkeleton />
          </div>
        ) : isError && welfareRequests.length === 0 ? (
          <ErrorState
            title="Could not load requests"
            message={errorMessage || 'Failed to retrieve submitted tickets.'}
            onRetry={refetchData}
          />
        ) : myWelfareRequests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions yet"
            description="You have not filed any welfare support or suggestion tickets."
          />
        ) : (
          <div className="space-y-4 divide-y divide-gray-100">
            {myWelfareRequests.map((req) => (
              <div key={req.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="bg-brand-blue/5 text-brand-blue border border-brand-blue/10 px-2 py-0.5 rounded-md font-bold uppercase">
                    {req.type === 'welfare' ? 'Welfare request' : 'Suggestion'}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                <h4 className="font-extrabold text-xs text-gray-900 leading-tight break-words">{req.title}</h4>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed break-words">{req.content}</p>
                <span className="text-[9px] text-gray-400 block font-semibold">Submitted on: {req.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// --- TAB: Anonymous Complaint Box ---
function ComplaintTab() {
  const { addComplaint } = useApp();

  const [complaintPriority, setComplaintPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintContent, setComplaintContent] = useState('');
  const [generatedTrackingCode, setGeneratedTrackingCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!complaintTitle.trim() || !complaintContent.trim()) {
      setFormError('Please provide both a topic and descriptive explanation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trackingCode = await addComplaint(complaintTitle.trim(), complaintContent.trim(), complaintPriority);
      setGeneratedTrackingCode(trackingCode);
      setComplaintTitle('');
      setComplaintContent('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit complaint. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTrackingCode = () => {
    if (generatedTrackingCode && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedTrackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-extrabold text-sm text-gray-900">Confidential Complaint Box</h3>
          </div>
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-600 shrink-0" />
            100% Anonymous
          </span>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {generatedTrackingCode ? (
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
            <CheckCircle className="w-12 h-12 mx-auto text-brand-green" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">Complaint Logged Confidentially!</h4>
              <p className="text-xs text-gray-500 mt-1">Your user details have been completely masked in the operational pipeline database.</p>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-3.5 max-w-xs mx-auto text-center shadow-sm">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Your tracking code</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <code className="text-base font-extrabold text-red-600 select-all">{generatedTrackingCode}</code>
                <button
                  type="button"
                  onClick={copyTrackingCode}
                  className="text-xs text-brand-blue font-bold hover:underline"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-red-600 font-semibold max-w-sm mx-auto leading-relaxed">
              ⚠️ Save this tracking code. Because your submission is anonymous, this code is the only way to track progress or receive updates.
            </p>

            <button
              onClick={() => setGeneratedTrackingCode(null)}
              className="text-xs font-bold text-brand-blue hover:underline block mx-auto pt-2"
            >
              File Another Complaint
            </button>
          </div>
        ) : (
          <form onSubmit={handleComplaintSubmit} className="space-y-4 text-xs font-semibold">
            <div className="bg-gray-50 rounded-xl p-3.5 text-[10.5px] font-semibold text-gray-600 leading-relaxed border border-gray-200/60">
              💡 System Security Lock: This form uses a secure pipeline that completely masks user metadata (such as ID, name, IP and email) upon database insertion. Your anonymity is absolute.
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Issue Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={complaintTitle}
                onChange={(e) => setComplaintTitle(e.target.value)}
                placeholder="e.g. Hub cleanliness, AC setting in sandbox, hardware safety concerns..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Explain Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                value={complaintContent}
                onChange={(e) => setComplaintContent(e.target.value)}
                placeholder="Provide descriptive details regarding the issue or infraction..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-blue font-medium text-gray-800 resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Urgency</label>
              <select
                value={complaintPriority}
                onChange={(e) => setComplaintPriority(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Urgency</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>{isSubmitting ? 'Logging...' : 'Log Complaint Anonymously'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- TAB: Admin Resolver Desk ---
function ResolverTab() {
  const { welfareRequests, complaints, updateWelfareStatus, updateComplaintStatus } = useApp();
  const [deskFilter, setDeskFilter] = useState<'all' | 'welfare' | 'complaints' | 'suggestions'>('all');

  const filteredWelfare = welfareRequests.filter(req => {
    if (deskFilter === 'welfare') return req.type === 'welfare';
    if (deskFilter === 'suggestions') return req.type === 'suggestion';
    return true;
  });

  return (
    <div className="space-y-6">

      {/* Admin Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <HeartHandshake className="w-8 h-8 text-brand-blue" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Welfare Tickets</span>
            <span className="text-lg font-extrabold text-gray-900">
              {welfareRequests.filter(w => w.type === 'welfare').length} active
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Confidential Complaints</span>
            <span className="text-lg font-extrabold text-gray-900">{complaints.length} active</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <Inbox className="w-8 h-8 text-brand-blue" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">General Suggestions</span>
            <span className="text-lg font-extrabold text-gray-900">
              {welfareRequests.filter(w => w.type === 'suggestion').length} submitted
            </span>
          </div>
        </div>
      </div>

      {/* Cases Resolver List Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="bg-brand-black text-brand-white px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-blue" />
            <span className="text-xs font-bold uppercase tracking-widest text-sky-blue">Case Resolver Desk</span>
          </div>

          <div className="flex flex-wrap bg-gray-800 rounded-lg p-0.5 text-[10px] gap-px">
            {(['all', 'welfare', 'complaints', 'suggestions'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDeskFilter(f)}
                className={`px-2.5 py-1.5 rounded-md font-bold transition-all capitalize ${
                  deskFilter === f ? 'bg-brand-blue text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 divide-y divide-gray-100">

          {/* Welfare & Suggestions */}
          {(deskFilter === 'all' || deskFilter === 'welfare' || deskFilter === 'suggestions') &&
            (filteredWelfare.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No active welfare or suggestion requests in this filter.
              </div>
            ) : (
              filteredWelfare.map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-brand-blue bg-brand-blue/5 border border-brand-blue/10 px-2 py-0.5 rounded-md">
                        {req.type === 'welfare' ? 'Welfare' : 'Suggestion'}
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{req.date}</span>
                    </div>

                    <h4 className="font-extrabold text-xs text-gray-900 break-words">{req.title}</h4>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed break-words">{req.content}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => updateWelfareStatus(req.id, e.target.value as any)}
                      className={`text-[10.5px] font-bold border rounded-lg px-2.5 py-1.5 focus:outline-none ${getStatusColor(req.status)}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))
            ))}

          {/* Anonymous Complaints */}
          {(deskFilter === 'all' || deskFilter === 'complaints') &&
            (complaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No anonymous complaints logged.
              </div>
            ) : (
              complaints.map((comp) => (
                <div key={comp.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        Anonymous Case
                      </span>
                      <code className="text-[9.5px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {comp.trackingCode}
                      </code>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${getPriorityColor(comp.priority)}`}>
                        {comp.priority}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-gray-900 break-words">{comp.title}</h4>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed break-words">{comp.content}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <select
                      value={comp.status}
                      onChange={(e) => updateComplaintStatus(comp.id, e.target.value as any)}
                      className={`text-[10.5px] font-bold border rounded-lg px-2.5 py-1.5 focus:outline-none ${getStatusColor(comp.status)}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))
            ))}

        </div>
      </div>

    </div>
  );
}

function WelfareContent() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'welfare';

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Welfare & Complaint Portal</h2>
          <p className="text-xs text-gray-500 mt-1">
            Submit resource requests, file confidential concerns, or access administrative resolver desks.
          </p>
        </div>

        {tab === 'complaint' ? (
          <ComplaintTab />
        ) : tab === 'resolver' && isAdmin ? (
          <ResolverTab />
        ) : (
          <WelfareTab />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function WelfarePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading welfare portal...
      </div>
    }>
      <WelfareContent />
    </Suspense>
  );
}
