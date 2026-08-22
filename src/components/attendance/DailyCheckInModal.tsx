'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { checkGeofence, formatDistance } from '@/lib/geofence';
import type { DailyCheckInStatus } from '@/context/AppContext';
import { MapPin, CheckCircle, Lock, AlertTriangle, Loader2, RotateCcw, X, Flame, Calendar, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState = 'requesting' | 'verifying' | 'success' | 'outside' | 'denied' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; avatar: string };
  onCheckInSuccess: (userId: string) => Promise<{ success: boolean; message?: string }>;
  getDailyCheckInStatus: (userId: string) => DailyCheckInStatus;
  /** Dev-mode: simulate being at the hub without real GPS match */
  devSimulate?: boolean;
}

// ─── Confetti particle system ────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  width: number; height: number;
  rotation: number; rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = [
  '#177AE5', '#00C48C', '#F59E0B', '#EC4899',
  '#8B5CF6', '#EF4444', '#06B6D4', '#F97316',
];

function createParticle(canvasW: number): Particle {
  return {
    x: Math.random() * canvasW,
    y: -10,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    width: Math.random() * 10 + 6,
    height: Math.random() * 6 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 6,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const spawnEndRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particlesRef.current = [];
    spawnEndRef.current = Date.now() + 2800; // spawn for 2.8s

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles
      if (Date.now() < spawnEndRef.current) {
        for (let i = 0; i < 4; i++) {
          particlesRef.current.push(createParticle(canvas.width));
        }
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx += (Math.random() - 0.5) * 0.2; // drift
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height - 60) p.opacity -= 0.04;

        if (p.opacity <= 0) return false;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        }
        ctx.restore();
        return true;
      });

      if (particlesRef.current.length > 0 || Date.now() < spawnEndRef.current) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [active]);

  return canvasRef;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Branded pulse rings */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand-blue/10 animate-ping" />
        <span className="absolute inset-2 rounded-full bg-brand-blue/15 animate-ping [animation-delay:200ms]" />
        <div className="relative w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/30">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-extrabold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 font-medium">Please wait…</p>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function DailyCheckInModal({
  open, onClose, currentUser, onCheckInSuccess, getDailyCheckInStatus, devSimulate = false
}: Props) {
  const [state, setState] = useState<ModalState>('requesting');
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [hubName, setHubName] = useState('Renaissance Innovation Labs');
  const [countdown, setCountdown] = useState(4);
  const [devMode, setDevMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = getDailyCheckInStatus(currentUser.id);
  const confettiActive = state === 'success';
  const confettiCanvasRef = useConfetti(confettiActive);

  // ── Check-in submission ────────────────────────────────────────────────────

  // Await the authoritative write, then show success or a real error.
  const submitCheckIn = useCallback(async () => {
    setState('verifying');
    setErrorMsg(null);
    try {
      const res = await onCheckInSuccess(currentUser.id);
      if (res.success) {
        setState('success');
        setCountdown(4);
      } else {
        setErrorMsg(res.message ?? 'Check-in could not be saved.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error — your check-in was not saved. Please try again.');
      setState('error');
    }
  }, [currentUser.id, onCheckInSuccess]);

  // ── Geolocation flow ─────────────────────────────────────────────────────

  const runGeolocation = useCallback((simulate = false) => {
    setState('requesting');
    setDistanceM(null);
    setErrorMsg(null);

    if (simulate) {
      // Dev simulation — skip real GPS
      setState('verifying');
      setTimeout(() => { void submitCheckIn(); }, 1400);
      return;
    }

    if (!navigator.geolocation) {
      setState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState('verifying');
        // Small artificial delay for UX realism
        setTimeout(() => {
          const result = checkGeofence(pos.coords.latitude, pos.coords.longitude);
          setDistanceM(result.distanceM);
          setHubName(result.hub.name);
          if (result.within) {
            void submitCheckIn();
          } else {
            setState('outside');
          }
        }, 1000);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState('denied');
        } else {
          setState('error');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }, [currentUser.id, onCheckInSuccess, submitCheckIn]);

  // Start flow when modal opens
  useEffect(() => {
    if (!open) return;
    setState('requesting');
    runGeolocation(devMode || devSimulate);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss countdown on success
  useEffect(() => {
    if (state !== 'success') return;
    let count = 4;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        setCountdown(0);
        onClose();
      } else {
        setCountdown(count);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current!);
  }, [state, onClose]);

  // Reset dev mode toggle when modal re-opens
  useEffect(() => { if (open) setDevMode(false); }, [open]);

  if (!open) return null;

  // ── State content ─────────────────────────────────────────────────────────

  const renderContent = () => {
    if (state === 'requesting') return <Spinner label="Requesting location…" />;
    if (state === 'verifying') return <Spinner label="Verifying your location…" />;

    if (state === 'success') {
      const finalStatus = getDailyCheckInStatus(currentUser.id);
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return (
        <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-500">
          {/* Success ring */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-brand-green/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-brand-green flex items-center justify-center shadow-xl shadow-brand-green/40">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-gray-900">You're checked in for today!</h3>
            <p className="text-xs text-gray-400 font-semibold">Attendance recorded at RIL Hub · {finalStatus.checkInTime ?? now}</p>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 w-full">
            <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-gray-900">{finalStatus.streak}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Day Streak</p>
            </div>
            <div className="flex-1 bg-brand-blue/5 border border-brand-blue/10 rounded-xl p-3 text-center">
              <Calendar className="w-5 h-5 text-brand-blue mx-auto mb-1" />
              <p className="text-lg font-extrabold text-gray-900">{finalStatus.totalDays}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Days</p>
            </div>
            <div className="flex-1 bg-brand-green/5 border border-brand-green/10 rounded-xl p-3 text-center">
              <Zap className="w-5 h-5 text-brand-green mx-auto mb-1" />
              <p className="text-lg font-extrabold text-gray-900">+50</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">XP Earned</p>
            </div>
          </div>

          <p className="text-[10.5px] text-gray-400 font-semibold">
            Returning to your page in <span className="text-brand-blue font-extrabold">{countdown}s</span>…
          </p>
        </div>
      );
    }

    if (state === 'outside') {
      return (
        <div className="flex flex-col items-center gap-5 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <MapPin className="w-9 h-9 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-gray-900">You must be at the RIL Hub</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs">
              Attendance can only be recorded when you are physically present at an approved hub location.
            </p>
          </div>
          {distanceM !== null && (
            <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-left space-y-1">
              <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Distance from hub</p>
              <p className="text-sm font-extrabold text-red-600">{formatDistance(distanceM)} away from {hubName}</p>
              <p className="text-[10.5px] text-gray-400 font-medium">You need to be within 150m to check in.</p>
            </div>
          )}
          <button
            onClick={() => runGeolocation(devMode)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-extrabold hover:bg-brand-blue/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Location Verification
          </button>
        </div>
      );
    }

    if (state === 'denied') {
      return (
        <div className="flex flex-col items-center gap-5 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Lock className="w-9 h-9 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-gray-900">Location access required</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs">
              Location access is required to verify your attendance at the hub. Please enable it and retry.
            </p>
          </div>
          <div className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-left space-y-2">
            <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">How to enable</p>
            <ol className="list-decimal list-inside text-[10.5px] text-gray-600 font-semibold space-y-1.5">
              <li>Click the lock/info icon in your browser's address bar</li>
              <li>Find <strong>Location</strong> and set it to <strong>Allow</strong></li>
              <li>Reload the page and try again</li>
            </ol>
          </div>
          <button
            onClick={() => runGeolocation(devMode)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-extrabold hover:bg-brand-blue/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }

    // Generic error
    return (
      <div className="flex flex-col items-center gap-5 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
          <AlertTriangle className="w-9 h-9 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-gray-900">Something went wrong</h3>
          <p className="text-xs text-gray-500 font-medium">{errorMsg ?? "We couldn't retrieve your location. Check your connection and try again."}</p>
        </div>
        <button
          onClick={() => runGeolocation(devMode)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-extrabold hover:bg-brand-blue/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Confetti canvas — absolute above everything */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-[100]"
        aria-hidden="true"
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        onClick={state !== 'success' ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Daily Hub Check-In"
        className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 relative animate-in fade-in zoom-in-95 duration-300">

          {/* Close button */}
          {state !== 'success' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Header (shown only during loading states) */}
          {(state === 'requesting' || state === 'verifying') && (
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/8 border border-brand-blue/15 mb-3">
                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">
                  Attendance Verification
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-semibold">
                {state === 'verifying' ? 'Checking attendance eligibility…' : 'Initialising location services…'}
              </p>
            </div>
          )}

          {/* Main content area */}
          {renderContent()}

          {/* ── Dev Mode Toggle (always visible, clearly labelled) ── */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <label className="flex items-center justify-between cursor-pointer group select-none">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dev Mode</p>
                <p className="text-[9.5px] text-gray-300 font-medium">Simulate hub location (demo only)</p>
              </div>
              <button
                onClick={() => {
                  const next = !devMode;
                  setDevMode(next);
                  if (state !== 'success') runGeolocation(next);
                }}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  devMode ? 'bg-brand-blue' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={devMode}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  devMode ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
