'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScoreGauge from '@/components/ScoreGauge';
import { getSession, saveSession } from '@/lib/storage';
import { Session, SessionReport, TranscriptSegment } from '@/lib/types';

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('id');

  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

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

    // If report already exists, use it and show immediately
    if (loadedSession.report) {
      setReport(loadedSession.report);
      // Still show loading for consistency, but briefly
      setTimeout(() => {
        setLoading(false);
        setShowContent(true);
      }, 300);
      return;
    }

    // Generate report with minimum delay for API
    generateReport(loadedSession);
  }, [sessionId, router]);

  const generateReport = async (sessionData: Session) => {
    const requestBody = {
      mode: sessionData.mode,
      type: sessionData.type,
      context: sessionData.context,
      interviewSetup: sessionData.interviewSetup,
      duration_seconds: sessionData.duration,
      transcript: sessionData.transcript,
      enrichedTranscript: sessionData.enrichedTranscript,
      codingData: sessionData.codingData,
      metrics: sessionData.metrics,
      final_score: sessionData.finalScore,
    };

    console.log('📝 REPORT API Request:', requestBody);

    try {
      const startTime = Date.now();
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const reportData = await response.json();
        console.log('📝 REPORT API Response:', reportData);
        setReport(reportData);

        // Save report to session AND extract scores to session level
        const updatedSession = { 
          ...sessionData, 
          report: reportData,
          presentationScore: reportData.presentationScore,
          contentScore: reportData.contentScore,
        };
        saveSession(updatedSession);
        setSession(updatedSession);

        // Ensure minimum 1.5 second delay for better UX
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(1500 - elapsedTime, 0);
        setTimeout(() => {
          setLoading(false);
          setShowContent(true);
        }, remainingDelay);
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
      // Still wait before showing
      setTimeout(() => {
        setLoading(false);
        setShowContent(true);
      }, 1500);
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
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-blue-950">
      {/* Header */}
      <Navbar>
        <a
          href="/"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          New Session
        </a>
      </Navbar>

      {/* Content */}
      <div className="flex-1 p-8">
        {loading ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-400 text-lg">Generating your personalized report...</p>
          </div>
        ) : !showContent ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-700 rounded w-32 mx-auto"></div>
              <div className="h-8 bg-gray-700 rounded w-48 mx-auto"></div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Session Report</h1>
              <p className="text-gray-400">
                {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)} Practice •{' '}
                {formatDuration(session.duration)}
              </p>
            </div>

            {/* Interview Question (if applicable) */}
            {session.interviewSetup && (
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Question Answered:</h3>
                <p className="text-white text-lg">{session.interviewSetup.selectedQuestion.question}</p>
                {session.interviewSetup.selectedQuestion.context && (
                  <p className="text-gray-400 text-sm mt-2">{session.interviewSetup.selectedQuestion.context}</p>
                )}
                {session.interviewSetup.source !== 'surprise_me' && (
                  <p className="text-gray-500 text-xs mt-3">
                    Question generated from: {session.interviewSetup.source === 'resume' ? 'Your Resume' : 'Job Description'}
                  </p>
                )}
              </div>
            )}

            {/* Score Display - Different layouts for interview vs presentation */}
            {session.mode === 'interview' && session.contentScore !== undefined ? (
              // Interview mode: Show both Presentation and Content scores side by side
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-6 border border-blue-500/30 flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">Presentation Score</h3>
                  <ScoreGauge score={session.presentationScore || session.finalScore} size="lg" />
                  <p className="text-gray-300 text-sm mt-4 text-center">
                    How you delivered: pace, confidence, eye contact, energy, and minimal filler words
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30 flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-4 text-purple-400">Content Score</h3>
                  <ScoreGauge score={session.contentScore} size="lg" />
                  <p className="text-gray-300 text-sm mt-4 text-center">
                    How well you answered the question: relevance, completeness, examples, and alignment with requirements
                  </p>
                </div>
              </div>
            ) : (
              // Presentation mode or interview without content score: Show single overall score
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
            )}

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
                      Areas to Improve
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
                    Next Goal
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
              
              {/* Legend for annotations */}
              {session.enrichedTranscript && session.enrichedTranscript.length > 0 && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                  <div className="font-medium text-gray-300 mb-2">Delivery Annotations:</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span><span className="text-blue-400">⏸️</span> pause</span>
                    <span><span className="bg-yellow-500/30 text-yellow-300 px-1 rounded">um</span> filler</span>
                    <span><span className="text-purple-400">🔈</span> quiet</span>
                    <span><span className="text-purple-400">🔊</span> loud</span>
                    <span><span className="text-cyan-400">↗️</span> rising pitch</span>
                    <span><span className="text-cyan-400">↘️</span> falling pitch</span>
                    <span><span className="text-green-400">⚡</span> high energy</span>
                    <span><span className="text-orange-400">😐</span> low energy</span>
                  </div>
                </div>
              )}
              
              <div className="text-gray-300 text-sm leading-relaxed">
                {session.enrichedTranscript && session.enrichedTranscript.length > 0 ? (
                  <EnrichedTranscriptDisplay segments={session.enrichedTranscript} />
                ) : (
                  <p className="whitespace-pre-wrap">{session.transcript || 'No transcript available.'}</p>
                )}
              </div>
            </div>
          )}
          </div>
        )}
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

// Component to display enriched transcript with visual annotations
function EnrichedTranscriptDisplay({ segments }: { segments: TranscriptSegment[] }) {
  return (
    <div className="space-y-1">
      {segments.map((segment, index) => {
        const elements: React.ReactNode[] = [];
        
        // Show pause indicator
        if (segment.pauseBefore && segment.pauseBefore > 500) {
          const pauseSec = (segment.pauseBefore / 1000).toFixed(1);
          elements.push(
            <span key={`pause-${index}`} className="text-blue-400 text-xs mx-1" title={`${pauseSec}s pause`}>
              ⏸️ ({pauseSec}s)
            </span>
          );
        }
        
        // Process text to highlight fillers
        let textContent: React.ReactNode = segment.text;
        if (segment.fillers && segment.fillers.length > 0) {
          const parts: React.ReactNode[] = [];
          let remaining = segment.text;
          let keyIdx = 0;
          
          const fillerPattern = new RegExp(`\\b(${segment.fillers.join('|')})\\b`, 'gi');
          const matches = [...segment.text.matchAll(fillerPattern)];
          
          if (matches.length > 0) {
            let lastIndex = 0;
            for (const match of matches) {
              const idx = match.index!;
              if (idx > lastIndex) {
                parts.push(<span key={`t-${keyIdx++}`}>{segment.text.slice(lastIndex, idx)}</span>);
              }
              parts.push(
                <span key={`f-${keyIdx++}`} className="bg-yellow-500/30 text-yellow-300 rounded px-0.5" title="Filler word">
                  {match[0]}
                </span>
              );
              lastIndex = idx + match[0].length;
            }
            if (lastIndex < segment.text.length) {
              parts.push(<span key={`t-${keyIdx++}`}>{segment.text.slice(lastIndex)}</span>);
            }
            textContent = parts;
          }
        }
        
        // Build tone indicators
        const toneIndicators: React.ReactNode[] = [];
        if (segment.tone) {
          if (segment.tone.volume === 'quiet') {
            toneIndicators.push(<span key="vol-q" className="text-purple-400" title="Quiet">🔈</span>);
          } else if (segment.tone.volume === 'loud') {
            toneIndicators.push(<span key="vol-l" className="text-purple-400" title="Loud">🔊</span>);
          }
          if (segment.tone.energy === 'high') {
            toneIndicators.push(<span key="eng-h" className="text-green-400" title="High energy">⚡</span>);
          } else if (segment.tone.energy === 'low') {
            toneIndicators.push(<span key="eng-l" className="text-orange-400" title="Low energy">😐</span>);
          }
          if (segment.tone.pitchTrend === 'rising') {
            toneIndicators.push(<span key="pitch-r" className="text-cyan-400" title="Rising pitch">↗️</span>);
          } else if (segment.tone.pitchTrend === 'falling') {
            toneIndicators.push(<span key="pitch-f" className="text-cyan-400" title="Falling pitch">↘️</span>);
          }
        }
        
        // Speaking rate styling
        const rateClass = segment.speakingRate === 'fast' 
          ? 'tracking-tighter italic' 
          : segment.speakingRate === 'slow' 
          ? 'tracking-wider' 
          : '';
        
        const hesitationClass = segment.isHesitation ? 'text-orange-300' : '';
        
        elements.push(
          <span key={`text-${index}`} className={`${rateClass} ${hesitationClass}`.trim()}>
            {textContent}
          </span>
        );
        
        if (toneIndicators.length > 0) {
          elements.push(
            <span key={`tone-${index}`} className="text-xs ml-0.5 opacity-70">
              {toneIndicators}
            </span>
          );
        }
        
        elements.push(<span key={`space-${index}`}> </span>);
        
        return elements;
      })}
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
