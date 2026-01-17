'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScoreGauge from '@/components/ScoreGauge';
import { getSession, saveSession } from '@/lib/storage';
import { Session, SessionReport } from '@/lib/types';

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('id');

  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    const loadedSession = getSession(sessionId);
    if (!loadedSession) {
      router.push('/');
      return;
    }

    setSession(loadedSession);

    // If report already exists, use it
    if (loadedSession.report) {
      setReport(loadedSession.report);
      setLoading(false);
      return;
    }

    // Generate report
    generateReport(loadedSession);
  }, [sessionId, router]);

  const generateReport = async (sessionData: Session) => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: sessionData.mode,
          duration_seconds: sessionData.duration,
          transcript: sessionData.transcript,
          metrics: sessionData.metrics,
          final_score: sessionData.finalScore,
        }),
      });

      if (response.ok) {
        const reportData = await response.json();
        setReport(reportData);

        // Save report to session
        const updatedSession = { ...sessionData, report: reportData };
        saveSession(updatedSession);
        setSession(updatedSession);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Use fallback report
      setReport({
        overall_summary: 'Session completed successfully.',
        strengths: ['Good effort', 'Completed session'],
        improvements: ['Continue practicing', 'Focus on metrics', 'Review feedback'],
        next_goal: 'Practice again to improve your score.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading session...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <Navbar>
        <a
          href="/history"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          View History
        </a>
        <a
          href="/"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          New Session
        </a>
      </Navbar>

      {/* Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Session Report</h1>
            <p className="text-gray-400">
              {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)} Practice •{' '}
              {formatDuration(session.duration)}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800 flex flex-col items-center">
            <ScoreGauge score={session.finalScore} size="lg" />
            <h2 className="text-xl font-semibold mt-4">
              {session.finalScore >= 80
                ? 'Excellent Performance!'
                : session.finalScore >= 60
                ? 'Good Job!'
                : 'Keep Practicing!'}
            </h2>
          </div>

          {loading ? (
            <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Generating your personalized report...</p>
            </div>
          ) : (
            report && (
              <>
                {/* Summary */}
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-lg font-semibold mb-3">Summary</h3>
                  <p className="text-gray-300 leading-relaxed">{report.overall_summary}</p>
                </div>

                {/* Strengths & Improvements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/30">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="text-green-400">✓</span> Strengths
                    </h3>
                    <ul className="space-y-2">
                      {report.strengths.map((strength, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="bg-orange-500/10 rounded-xl p-6 border border-orange-500/30">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="text-orange-400">↑</span> Areas to Improve
                    </h3>
                    <ul className="space-y-2">
                      {report.improvements.map((improvement, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-orange-400 mt-1">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Goal */}
                <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/30">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="text-blue-400">🎯</span> Next Goal
                  </h3>
                  <p className="text-gray-300">{report.next_goal}</p>
                </div>
              </>
            )
          )}

          {/* Metrics Summary */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Session Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Pace"
                value={`${session.metrics.pace_wpm} WPM`}
                target="140-160"
              />
              <MetricCard
                label="Filler Words"
                value={`${session.metrics.filler_rate_per_min}/min`}
                target="≤2"
              />
              <MetricCard
                label="Eye Contact"
                value={`${Math.round(session.metrics.eye_contact_pct * 100)}%`}
                target="≥70%"
              />
              <MetricCard
                label="Energy"
                value={`${Math.round(session.metrics.motion_energy * 100)}%`}
                target="30-60%"
              />
            </div>
          </div>

          {/* Transcript */}
          {session.transcript && (
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-3">Transcript</h3>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                {session.transcript || 'No transcript available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  target,
}: {
  label: string;
  value: string;
  target: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-xs text-gray-500 mt-1">Target: {target}</div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading report...</div>
      </main>
    }>
      <ReportContent />
    </Suspense>
  );
}
