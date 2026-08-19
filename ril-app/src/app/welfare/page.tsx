'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import {
  HeartHandshake,
  ShieldAlert,
  Send,
  CheckCircle,
  FileText,
  Lock,
  Inbox
} from 'lucide-react';

// --- Helpers ---
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
  const { welfareRequests, currentUser, addWelfareRequest } = useApp();

  const [welfareCategory, setWelfareCategory] = useState<'welfare' | 'suggestion'>('welfare');
  const [welfarePriority, setWelfarePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [welfareTitle, setWelfareTitle] = useState('');
  const [welfareContent, setWelfareContent] = useState('');

  const myWelfareRequests = welfareRequests.filter(req => req.userId === currentUser.id);

  const handleWelfareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!welfareTitle.trim() || !welfareContent.trim()) return;
    addWelfareRequest(welfareCategory, welfareTitle, welfareContent, welfarePriority);
    setWelfareTitle('');
    setWelfareContent('');
    alert('Welfare/Suggestion ticket created! Administrators have been notified.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

      {/* File Request Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <HeartHandshake className="w-5 h-5 text-brand-blue" />
          <h3 className="font-extrabold text-sm text-gray-900">Request Welfare / Submit Suggestion</h3>
        </div>

        <form onSubmit={handleWelfareSubmit} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Ticket Type</label>
              <select
                value={welfareCategory}
                onChange={(e) => setWelfareCategory(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical/Welfare Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Subject</label>
            <input
              type="text"
              value={welfareTitle}
              onChange={(e) => setWelfareTitle(e.target.value)}
              placeholder="e.g. Subsidy for model training, keyboard replacement request..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Elaborate Request Details</label>
            <textarea
              value={welfareContent}
              onChange={(e) => setWelfareContent(e.target.value)}
              placeholder="Describe what resources, support, or adjustments you require..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs focus:outline-none focus:border-brand-blue font-medium text-gray-800 resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-brand-blue/95 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Request
          </button>
        </form>
      </div>

      {/* My Submitted Tickets */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <FileText className="w-5 h-5 text-brand-blue" />
          <h3 className="font-extrabold text-sm text-gray-900">My Registered Submissions</h3>
        </div>

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
              <h4 className="font-extrabold text-xs text-gray-900 leading-tight">{req.title}</h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed truncate">{req.content}</p>
              <span className="text-[9px] text-gray-400 block font-semibold">Submitted on: {req.date}</span>
            </div>
          ))}
          {myWelfareRequests.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 italic">
              You have not filed any welfare or suggestion tickets yet.
            </div>
          )}
        </div>
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

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTitle.trim() || !complaintContent.trim()) return;
    const trackingCode = await addComplaint(complaintTitle, complaintContent, complaintPriority);
    setGeneratedTrackingCode(trackingCode);
    setComplaintTitle('');
    setComplaintContent('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-extrabold text-sm text-gray-900">Confidential Complaint Box</h3>
          </div>
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-600 shrink-0" />
            100% Anonymous
          </span>
        </div>

        {generatedTrackingCode ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center space-y-3.5">
            <CheckCircle className="w-10 h-10 mx-auto text-brand-green" />
            <div>
              <h4 className="text-xs font-bold text-gray-900">Complaint Logged Confidentially!</h4>
              <p className="text-[11px] text-gray-500 mt-1">Your user details have been completely masked in the operational pipeline database.</p>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-3 max-w-xs mx-auto text-center shadow-sm">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Your tracking code</span>
              <p className="text-base font-extrabold text-red-600 mt-0.5 select-all">{generatedTrackingCode}</p>
            </div>

            <p className="text-[10px] text-red-600 font-semibold max-w-xs mx-auto leading-relaxed">
              ⚠️ Write this tracking code down. As no user ID is linked, you must search this code on the hub to view progress or receive response communications!
            </p>

            <button
              onClick={() => setGeneratedTrackingCode(null)}
              className="text-xs font-bold text-brand-blue hover:underline"
            >
              File Another Complaint
            </button>
          </div>
        ) : (
          <form onSubmit={handleComplaintSubmit} className="space-y-4 text-xs font-semibold">
            <div className="bg-gray-50 rounded-lg p-3 text-[10px] font-semibold text-gray-500 leading-relaxed border border-gray-200/50">
              💡 System Security Lock: This form uses a secure pipeline that completely masks user metadata (such as ID, name, IP and email) upon database insertion. Your anonymity is absolute.
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Issue Topic</label>
              <input
                type="text"
                value={complaintTitle}
                onChange={(e) => setComplaintTitle(e.target.value)}
                placeholder="e.g. Hub cleanliness, AC setting in sandbox, hardware safety concerns..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Explain Issue</label>
              <textarea
                value={complaintContent}
                onChange={(e) => setComplaintContent(e.target.value)}
                placeholder="Provide descriptive details regarding the issue or infraction..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs focus:outline-none focus:border-brand-blue font-medium text-gray-800 resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Urgency</label>
              <select
                value={complaintPriority}
                onChange={(e) => setComplaintPriority(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Urgency</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-white" />
              Log Complaint Anonymously
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

  return (
    <div className="space-y-6">

      {/* Admin Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
          <HeartHandshake className="w-8 h-8 text-brand-blue" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Welfare Tickets</span>
            <span className="text-lg font-extrabold text-gray-900">
              {welfareRequests.filter(w => w.type === 'welfare').length} active
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Confidential Complaints</span>
            <span className="text-lg font-extrabold text-gray-900">{complaints.length} active</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

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
            welfareRequests
              .filter(req => {
                if (deskFilter === 'welfare') return req.type === 'welfare';
                if (deskFilter === 'suggestions') return req.type === 'suggestion';
                return true;
              })
              .map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-brand-blue bg-brand-blue/5 border border-brand-blue/10 px-2 py-0.5 rounded-md">
                        {req.type === 'welfare' ? 'Welfare Request' : 'Suggestion'}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${getPriorityColor(req.priority)}`}>
                        {req.priority} priority
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(req.status)}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-gray-900">{req.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">{req.content}</p>
                    <span className="text-[10px] text-gray-400 block font-semibold">Submitted by: {req.userName} on {req.date}</span>
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      onClick={() => updateWelfareStatus(req.id, 'in_progress')}
                      disabled={req.status === 'in_progress'}
                      className="bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateWelfareStatus(req.id, 'resolved')}
                      disabled={req.status === 'resolved'}
                      className="bg-brand-green/10 border border-brand-green/20 text-brand-green hover:bg-brand-green/20 text-[10px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Resolve Case
                    </button>
                  </div>
                </div>
              ))}

          {/* Anonymous Complaints */}
          {(deskFilter === 'all' || deskFilter === 'complaints') &&
            complaints.map((comp) => (
              <div key={comp.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-500" />
                      Anonymous Complaint ({comp.trackingCode})
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${getPriorityColor(comp.priority)}`}>
                      {comp.priority} priority
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(comp.status)}`}>
                      {comp.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-gray-900">{comp.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">{comp.content}</p>

                  <div className="bg-red-50/50 rounded-lg p-2.5 max-w-sm text-[9.5px] font-semibold text-red-600 border border-red-200/50 flex items-center gap-1.5 mt-1">
                    <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Confidential pipeline secured. User identity masks are fully active.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  <button
                    onClick={() => updateComplaintStatus(comp.id, 'in_progress')}
                    disabled={comp.status === 'in_progress'}
                    className="bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(comp.id, 'resolved')}
                    disabled={comp.status === 'resolved'}
                    className="bg-brand-green/10 border border-brand-green/20 text-brand-green hover:bg-brand-green/20 text-[10px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Resolve Case
                  </button>
                </div>
              </div>
            ))}

          {welfareRequests.length === 0 && complaints.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400 italic">No tickets or governance cases currently filed.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Inner component that reads search params ---
function WelfarePage() {
  const searchParams = useSearchParams();
  const { currentUser } = useApp();
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const tab = searchParams.get('tab') || 'welfare';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Welfare & Governance Gateway</h2>
          <p className="text-xs text-gray-500 mt-1">
            Renaissance Innovation Labs is built on mutual support. Use this channel to request welfare assistance, submit hub suggestions, or voice fully anonymous complaints.
          </p>
        </div>

        {/* Tab Content */}
        {tab === 'welfare' && <WelfareTab />}
        {tab === 'complaint' && <ComplaintTab />}
        {tab === 'resolver' && isAdmin && <ResolverTab />}
        {tab === 'resolver' && !isAdmin && (
          <div className="max-w-md mx-auto mt-12 bg-white rounded-lg border border-red-200 p-8 text-center space-y-4 shadow-md">
            <Lock className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Access Denied</h3>
              <p className="text-xs text-gray-500 mt-2">
                The Resolver Desk is restricted to admin personnel only. Switch to an admin persona to access this view.
              </p>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// --- Default export wrapped in Suspense ---
export default function WelfareAndComplaints() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0F4F8]" />}>
      <WelfarePage />
    </Suspense>
  );
}
