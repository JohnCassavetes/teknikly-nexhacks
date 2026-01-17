'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoPanel from '@/components/VideoPanel';
import ScoreGauge from '@/components/ScoreGauge';
import CueBadges from '@/components/CueBadges';
import LiveTranscript from '@/components/LiveTranscript';
import MetricsDisplay from '@/components/MetricsDisplay';
import CoachTip from '@/components/CoachTip';
import { Mode, Metrics, TranscriptSegment, CoachTip as CoachTipType } from '@/lib/types';
import { captureLocalMedia, stopMediaStream } from '@/lib/livekit';
import { createWisprFlow } from '@/lib/wispr';
import { createOverShootAnalyzer } from '@/lib/overshoot';
import { calculateScore, smoothScore, getActiveCues, getInitialMetrics } from '@/lib/scoring';
import { saveSession, generateSessionId } from '@/lib/storage';

function PracticeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') as Mode) || 'presentation';

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Media state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [skipCamera, setSkipCamera] = useState(true); // Camera off by default
  const [cameraRequested, setCameraRequested] = useState(false);

  // Analysis state
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(getInitialMetrics());
  const [score, setScore] = useState(50);  // Start neutral, score will update based on performance
  const [coachTip, setCoachTip] = useState<CoachTipType | null>(null);

  // Refs for cleanup
  const wisprRef = useRef<ReturnType<typeof createWisprFlow> | null>(null);
  const overshootRef = useRef<ReturnType<typeof createOverShootAnalyzer> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const coachTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  // Initialize camera on mount
  useEffect(() => {
    if (skipCamera) {
      // Skip camera initialization - will show gray screen
      return;
    }

    const initMedia = async () => {
      const mediaStream = await captureLocalMedia();
      if (mediaStream) {
        setStream(mediaStream);
      } else {
        setPermissionDenied(true);
      }
    };
    initMedia();

    return () => {
      if (stream) {
        stopMediaStream(stream);
      }
    };
  }, [skipCamera]);

  // Timer for elapsed time
  useEffect(() => {
    if (isActive && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, startTime]);

  // Update score when metrics change
  useEffect(() => {
    if (isActive) {
      const newScore = calculateScore(metrics);
      setScore((prev) => smoothScore(prev, newScore));
    }
  }, [metrics, isActive]);

  // Handle video element for OverShoot
  const handleVideoElement = useCallback((video: HTMLVideoElement) => {
    if (overshootRef.current) {
      overshootRef.current.initialize(video);
    }
  }, []);

  // Fetch coaching tip periodically
  const fetchCoachTip = useCallback(async () => {
    if (!isActive) return;

    const recentTranscript = transcript
      .filter((s) => s.isFinal)
      .slice(-5)
      .map((s) => s.text)
      .join(' ');

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          recent_transcript: recentTranscript,
          metrics: {
            pace_wpm: metrics.pace_wpm,
            filler_rate_per_min: metrics.filler_rate_per_min,
            eye_contact_pct: metrics.eye_contact_pct,
            max_pause_ms: metrics.max_pause_ms,
            motion_energy: metrics.motion_energy,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCoachTip(data);
      }
    } catch (error) {
      console.error('Failed to fetch coach tip:', error);
    }
  }, [isActive, transcript, metrics, mode]);

  // Start session
  const startSession = useCallback(() => {
    if (!stream && !skipCamera) return;

    setIsActive(true);
    setStartTime(Date.now());
    setTranscript([]);
    setMetrics(getInitialMetrics());
    setScore(50);  // Start neutral
    setCoachTip(null);
    sessionIdRef.current = generateSessionId();

    // Initialize Wispr (speech recognition)
    wisprRef.current = createWisprFlow();
    wisprRef.current.start({
      onTranscript: (segment) => {
        setTranscript((prev) => {
          // Replace pending segments, add final ones
          if (segment.isFinal) {
            const filtered = prev.filter((s) => s.isFinal);
            return [...filtered, segment];
          }
          const finals = prev.filter((s) => s.isFinal);
          return [...finals, segment];
        });
      },
      onMetricsUpdate: (speechMetrics) => {
        setMetrics((prev) => ({
          ...prev,
          pace_wpm: speechMetrics.pace_wpm,
          filler_rate_per_min: speechMetrics.filler_rate_per_min,
          pause_count: speechMetrics.pause_count,
          max_pause_ms: speechMetrics.max_pause_ms,
        }));
      },
    });

    // Initialize OverShoot (body language)
    overshootRef.current = createOverShootAnalyzer();
    const video = document.querySelector('video');
    console.log('🎥 Looking for video element:', video ? 'FOUND' : 'NOT FOUND');
    if (video) {
      console.log('🔧 Initializing OverShoot with video element...');
      overshootRef.current.initialize(video as HTMLVideoElement).then(() => {
        console.log('✅ OverShoot initialized, starting analysis...');
        overshootRef.current?.start({
          onSignals: (signals) => {
            console.log('📊 OverShoot signals received:', signals);
            setMetrics((prev) => ({
              ...prev,
              eye_contact_pct: signals.eye_contact_pct,
              motion_energy: signals.motion_energy,
            }));
          },
        });
      }).catch((err) => {
        console.error('❌ OverShoot initialization failed:', err);
      });
    } else {
      console.warn('⚠️ No video element found - OverShoot body language analysis disabled');
    }

    // Start periodic coaching tips - more frequently for better feedback
    coachTimerRef.current = setInterval(fetchCoachTip, 8000);  // Every 8 seconds
    // Fetch first tip after 5 seconds
    setTimeout(fetchCoachTip, 5000);
  }, [stream, skipCamera, fetchCoachTip]);

  // End session
  const endSession = useCallback(async () => {
    setIsActive(false);

    // Stop analysis
    if (wisprRef.current) {
      wisprRef.current.stop();
    }
    if (overshootRef.current) {
      overshootRef.current.stop();
    }
    if (coachTimerRef.current) {
      clearInterval(coachTimerRef.current);
    }

    // Get full transcript
    const fullTranscript = transcript
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');

    // Save session to localStorage
    const session = {
      id: sessionIdRef.current,
      mode,
      startTime: startTime || Date.now(),
      endTime: Date.now(),
      duration: elapsedTime,
      finalScore: score,
      metrics,
      transcript: fullTranscript,
      report: null,
    };

    saveSession(session);

    // Navigate to report page
    router.push(`/report?id=${sessionIdRef.current}`);
  }, [transcript, mode, startTime, elapsedTime, score, metrics, router]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeCues = getActiveCues(metrics);

  if (permissionDenied) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📷</div>
          <h1 className="text-2xl font-bold mb-2">Camera Access Required</h1>
          <p className="text-gray-400 mb-4">
            TalkCoach needs access to your camera and microphone to analyze your
            communication.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <Navbar>
        {isActive && (
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
        )}
        {isActive ? (
          <button
            onClick={endSession}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            End Session
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={!stream && !skipCamera}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session
          </button>
        )}
      </Navbar>

      {/* Main Content */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Video */}
        <div className="lg:col-span-2 space-y-4">
          <VideoPanel stream={stream} onVideoElement={handleVideoElement} />

          {/* Coaching cues overlay */}
          {isActive && (
            <div className="space-y-3">
              <CueBadges activeCues={activeCues} />
              <CoachTip tip={coachTip} />
            </div>
          )}

          {/* Transcript */}
          <LiveTranscript segments={transcript} maxHeight="150px" />
        </div>

        {/* Right: Score & Metrics */}
        <div className="space-y-4">
          {/* Score Gauge */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 flex flex-col items-center">
            <ScoreGauge score={score} size="lg" />
            <p className="text-gray-400 text-sm mt-4">
              {score >= 80
                ? 'Excellent performance!'
                : score >= 60
                ? 'Good work, keep improving!'
                : 'Focus on the coaching tips'}
            </p>
          </div>

          {/* Metrics */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Live Metrics</h3>
            <MetricsDisplay metrics={metrics} />
          </div>

          {/* Instructions (when not active) */}
          {!isActive && (
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <h3 className="font-medium mb-2">How it works</h3>
              <ol className="text-sm text-gray-400 space-y-2">
                <li>1. Click Start Session when ready</li>
                <li>2. Speak naturally for 1-3 minutes</li>
                <li>3. Watch your live metrics and tips</li>
                <li>4. Click End Session for your report</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    }>
      <PracticeContent />
    </Suspense>
  );
}
