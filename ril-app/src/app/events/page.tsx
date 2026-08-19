'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { Event } from '@/lib/mockDb';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  QrCode,
  Tag,
  AlertCircle,
  X,
  FileText,
  Lock,
  PlusCircle
} from 'lucide-react';

// Deterministic QR-style glyph rendered from a string (demo visual — pairs with the
// self check-in passcode). Not a scannable spec QR, but visually convincing.
function QrGlyph({ value, size = 176 }: { value: string; size?: number }) {
  const N = 25;
  const cells = React.useMemo(() => {
    // FNV-1a hash seed + xorshift PRNG for stable, value-dependent module layout
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = () => {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };
    const grid: boolean[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => rand() > 0.5)
    );
    const finder = (r0: number, c0: number) => {
      for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
        const r = r0 + i, c = c0 + j;
        if (r < 0 || r >= N || c < 0 || c >= N) continue;
        grid[r][c] = false; // quiet zone
      }
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const border = i === 0 || i === 6 || j === 0 || j === 6;
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r0 + i][c0 + j] = border || inner;
      }
    };
    finder(0, 0);
    finder(0, N - 7);
    finder(N - 7, 0);
    return grid;
  }, [value]);

  const cell = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white" shapeRendering="crispEdges">
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#212120" /> : null
        )
      )}
    </svg>
  );
}

function EventsContent() {
  const { events, currentUser, toggleRsvp, addEvent } = useApp();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'calendar';

  // Search & Filter State (active in Calendar/Tickets view)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'program' | 'workshop' | 'hackathon' | 'social'>('all');
  const [qrEvent, setQrEvent] = useState<Event | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State for Scheduling
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'program' | 'workshop' | 'hackathon' | 'social' | 'governance'>('program');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('50');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'staff';

  // Determine events list based on tab
  const getFilteredEvents = () => {
    let list = events;
    if (tab === 'tickets') {
      list = events.filter(e => e.isRsvped);
    }
    
    return list.filter(e => {
      return selectedCategory === 'all' || e.category === selectedCategory;
    });
  };

  const activeEvents = getFilteredEvents();

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location || !date || !time) {
      alert("Please fill in all fields!");
      return;
    }

    addEvent({
      title,
      description,
      location,
      date,
      time,
      category,
      maxCapacity: parseInt(maxCapacity) || 50,
      qrCodeHash: `qr_ril_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
    });

    // Reset Form & Redirect to Calendar Board
    setTitle('');
    setCategory('program');
    setDescription('');
    setLocation('');
    setDate('');
    setTime('');
    setMaxCapacity('50');
    alert("New program scheduled successfully!");
    window.location.href = "/events?tab=calendar";
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'program': return 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20';
      case 'workshop': return 'bg-blue-green/10 text-blue-green border border-blue-green/20';
      case 'hackathon': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'social': return 'bg-brand-green/10 text-brand-green border border-brand-green/20';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header Bar */}
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Events & Programs</h2>
          <p className="text-xs text-gray-500 mt-1">
            Stay in the loop with RIL cohort timelines, workshops, hackathons, and community birthday mingles.
          </p>
        </div>

        {tab === 'schedule' ? (
          /* --- TABS 3: ADMIN SCHEDULE FORM --- */
          isAdmin ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl animate-in fade-in duration-200">
              <div className="bg-brand-black text-brand-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-sky-blue">Administrator Panel</h3>
                  <h4 className="text-sm font-extrabold text-white mt-0.5">Schedule Hub Program</h4>
                </div>
                <PlusCircle className="w-5 h-5 text-sky-blue" />
              </div>

              <form onSubmit={handleCreateEvent} className="p-6 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Event Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. PCB Assembly Workshop"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-700"
                    >
                      <option value="program">Operational Program</option>
                      <option value="workshop">Technical Workshop</option>
                      <option value="hackathon">Hackathon Challenge</option>
                      <option value="social">Community Social</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Max Capacity</label>
                    <input
                      type="number"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. RIL Hardware Sandbox / Zoom"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Time Range</label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="e.g. 10:00 - 13:00"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue font-bold text-gray-800"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail event activities, prerequisites, speaker information..."
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs focus:outline-none focus:border-brand-blue font-semibold text-gray-800 resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 flex gap-3 justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Schedule Timeline
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="max-w-md bg-white border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-sm animate-in fade-in">
              <Lock className="w-10 h-10 text-red-500 mx-auto" />
              <h4 className="font-extrabold text-sm text-gray-900">Access Restricted</h4>
              <p className="text-xs text-gray-500">Only hub coordinators or managers can schedule community timelines. Please switch persona roles to test.</p>
            </div>
          )
        ) : (
          /* --- TABS 1 & 2: CALENDAR BOARD & TICKETS LIST --- */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Filter Navigation Category Tabs */}
            <div className="border-b border-gray-200 flex flex-wrap gap-2">
              {(['all', 'program', 'workshop', 'hackathon', 'social'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors capitalize ${
                    selectedCategory === cat
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {cat === 'all' ? 'All Schedules' : `${cat}s`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-6">
              {activeEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6"
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${getCategoryColor(ev.category)}`}>
                        {ev.category}
                      </span>
                      
                      {ev.isRsvped && (
                        <span className="text-[10px] bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded-md font-bold">
                          ✓ RSVP Completed
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm md:text-base font-extrabold text-gray-900">{ev.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed mt-2">{ev.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-blue shrink-0" />
                        <span>{new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-blue shrink-0" />
                        <span>{ev.time}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between items-stretch md:items-end w-full md:w-52 shrink-0">
                    <div className="text-left md:text-right space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Attendance Capacity</span>
                      <div className="flex items-center gap-2 md:justify-end text-sm text-gray-700 font-bold">
                        <Users className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{ev.rsvpCount} / {ev.maxCapacity} Seats</span>
                      </div>
                      <div className="w-full md:w-36 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-brand-blue h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (ev.rsvpCount / ev.maxCapacity) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0 w-full">
                      <button
                        onClick={() => toggleRsvp(ev.id)}
                        className={`flex-1 text-xs font-bold py-2.5 rounded-xl border transition-colors shadow-sm ${
                          ev.isRsvped
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-brand-blue text-white border-transparent hover:bg-brand-blue/95'
                        }`}
                      >
                        {ev.isRsvped ? 'Cancel RSVP' : 'Reserve Spot'}
                      </button>

                      <button
                        onClick={() => { setQrEvent(ev); setCopied(false); }}
                        className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 p-2.5 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                        title="Show digital QR ticket"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {activeEvents.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-blue" />
                  <p className="text-xs font-semibold">
                    {tab === 'tickets' ? "You haven't RSVP'd to any schedules yet." : 'No schedules found for this category.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Digital QR Ticket Modal ── */}
      {qrEvent && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQrEvent(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brand-black px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-sky-blue" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Digital Check-In Ticket</span>
              </div>
              <button onClick={() => setQrEvent(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 leading-tight">{qrEvent.title}</h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">{qrEvent.location}</p>
              </div>

              <div className="p-3 rounded-2xl border border-gray-200 shadow-sm">
                <QrGlyph value={qrEvent.qrCodeHash} />
              </div>

              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-left">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Check-in passcode</span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <code className="text-[11px] font-bold text-brand-blue truncate">{qrEvent.qrCodeHash}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(qrEvent.qrCodeHash);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    }}
                    className="text-[10px] font-extrabold text-brand-blue hover:underline shrink-0"
                  >
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Present this code at the hub, or paste it into the <span className="font-bold text-gray-700">Self Check-In Console</span> under My Attendance to register your attendance.
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function EventsAndPrograms() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading schedules calendar...
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}
