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
import InterviewSetupModal from '@/components/InterviewSetupModal';
import PitchItemBar from '@/components/PitchItemBar';
import { Mode, Metrics, TranscriptSegment, CoachTip as CoachTipType, ToneInfo, CodingSessionData, InterviewSetupData } from '@/lib/types';
import { captureLocalMedia, stopMediaStream } from '@/lib/livekit';
import { createWisprFlow } from '@/lib/wispr';
import { createOverShootAnalyzer } from '@/lib/overshoot';
import { createToneAnalyzer } from '@/lib/toneAnalyzer';
import { calculateScore, smoothScore, getActiveCues, getInitialMetrics } from '@/lib/scoring';
import { saveSession, generateSessionId } from '@/lib/storage';
import CodingQuestion, { CodingQuestionRef, CodingQuestionType } from '@/components/CodingQuestion';
import { codingQuestions } from '@/lib/constants';

function PracticeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') as Mode) || 'presentation';
  const type = searchParams.get('type') || '';
  const isFollowUp = searchParams.get('isFollowUp') === 'true';
  const followUpQuestion = searchParams.get('followUpQuestion') || '';
  const previousSessionId = searchParams.get('previousSessionId') || '';

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Context prompt state (for presentations)
  const [showContextModal, setShowContextModal] = useState(false);
  const [sessionContext, setSessionContext] = useState('');
  const [isFollowUpSession, setIsFollowUpSession] = useState(false);

  // Interview setup state (for behavioral and technical interviews)
  const [showInterviewSetup, setShowInterviewSetup] = useState(false);
  const [interviewSetupData, setInterviewSetupData] = useState<InterviewSetupData | null>(null);

  // Pitch mode state
  const [pitchMode, setPitchMode] = useState<'own' | 'random' | null>(null);
  const [randomCategory, setRandomCategory] = useState('');
  const [randomProduct, setRandomProduct] = useState<{ product: string; description: string; key_features: string[] } | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Media state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [skipCamera, setSkipCamera] = useState(true); // Enable camera for real analysis

  // Analysis state
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(getInitialMetrics());
  const [score, setScore] = useState(50);  // Start neutral, score will update based on performance
  const [coachTip, setCoachTip] = useState<CoachTipType | null>(null);

  // Refs for cleanup
  const wisprRef = useRef<ReturnType<typeof createWisprFlow> | null>(null);
  const overshootRef = useRef<ReturnType<typeof createOverShootAnalyzer> | null>(null);
  const toneAnalyzerRef = useRef<ReturnType<typeof createToneAnalyzer> | null>(null);
  const currentToneRef = useRef<ToneInfo>({ volume: 'normal', energy: 'medium', pitchTrend: 'flat' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const coachTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());


  // Show coding section for programming interviews
  const [showCodingSection, setShowCodingSection] = useState(false);

  // Random coding question for programming interviews
  const [selectedCodingQuestion, setSelectedCodingQuestion] = useState<any>(() => {
    const randomIndex = Math.floor(Math.random() * codingQuestions.length);
    return codingQuestions[randomIndex];
  });

  // Ref to access CodingQuestion component methods
  const codingQuestionRef = useRef<CodingQuestionRef>(null);

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

  // Handle follow-up initialization
  useEffect(() => {
    if (isFollowUp && followUpQuestion && !showContextModal && !showInterviewSetup) {
      // Set context to the follow-up question
      setSessionContext(followUpQuestion);
      setIsFollowUpSession(true);
      
      // Determine if we should show setup
      const interviewTypesWithSetup = ['behavioral', 'technical'];
      if (mode === 'interview' && interviewTypesWithSetup.includes(type)) {
        // Load previous session to restore interview setup context
        const previousSession = localStorage.getItem(`session_${previousSessionId}`);
        if (previousSession) {
          const session = JSON.parse(previousSession);
          if (session.interviewSetup) {
            // Create a new setup with the follow-up question
            setInterviewSetupData({
              ...session.interviewSetup,
              selectedQuestion: {
                id: `followup_${Date.now()}`,
                question: followUpQuestion,
                context: 'Follow-up question to your previous response',
              },
              excludedQuestions: [...(session.interviewSetup.excludedQuestions || [])],
            });
          }
        }
      }
    }
  }, [isFollowUp, followUpQuestion, mode, type, previousSessionId, showContextModal, showInterviewSetup]);

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

    const requestBody = {
      mode,
      type,
      context: sessionContext,
      interviewSetup: interviewSetupData ? {
        source: interviewSetupData.source,
        resume: interviewSetupData.resume,
        jobDescription: interviewSetupData.jobDescription,
        selectedQuestion: interviewSetupData.selectedQuestion,
      } : undefined,
      recent_transcript: recentTranscript,
      metrics: {
        pace_wpm: metrics.pace_wpm,
        filler_rate_per_min: metrics.filler_rate_per_min,
        eye_contact_pct: metrics.eye_contact_pct,
        max_pause_ms: metrics.max_pause_ms,
        motion_energy: metrics.motion_energy,
      },
    };

    console.log('🎯 COACH API Request:', requestBody);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('COACH API Response:', data);
        setCoachTip(data);
      }
    } catch (error) {
      console.error('Failed to fetch coach tip:', error);
    }
  }, [isActive, transcript, metrics, mode, type, sessionContext, interviewSetupData]);

  // Types that support context prompts
  const contextTypes = ['business', 'comedy', 'school', 'pitch'];

  // Fetch random product for pitch mode
  const fetchRandomProduct = async (category?: string) => {
    setLoadingProduct(true);
    try {
      const response = await fetch('/api/random-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category || '' }),
      });
      if (response.ok) {
        const product = await response.json();
        setRandomProduct(product);
        // Set context to the product info
        setSessionContext(`Selling: ${product.product} - ${product.description}`);
      }
    } catch (error) {
      console.error('Failed to fetch random product:', error);
    } finally {
      setLoadingProduct(false);
    }
  };

  // Get modal content based on presentation type
  const getContextModalContent = () => {
    switch (type) {
      case 'comedy':
        return {
          title: 'Tell us about your set',
          description: 'Help us give you more relevant coaching by describing your comedy performance, or skip to get general feedback.',
          placeholder: 'e.g., 10-minute open mic set for a college crowd, observational comedy about dating, dark humor for a late-night club audience...'
        };
      case 'school':
        return {
          title: 'Tell us about your presentation',
          description: 'Help us give you more relevant coaching by describing your school presentation, or skip to get general feedback.',
          placeholder: 'e.g., 5th grade science fair project on volcanoes, high school history presentation on WWII, college thesis defense in computer science...'
        };
      case 'business':
      default:
        return {
          title: 'Tell us about your presentation',
          description: 'Help us give you more relevant coaching by describing what you\'re preparing for, or skip to get general feedback.',
          placeholder: 'e.g., Quarterly sales review for the leadership team, product launch pitch to investors, team project update...'
        };
    }
  };

  // Interview types that support the setup flow
  const interviewTypesWithSetup = ['behavioral', 'technical'];

  // Start session
  const startSession = useCallback(() => {
    

    if (!stream && !skipCamera) return;

    // For follow-ups, skip modals if context is already set
    if (isFollowUpSession && sessionContext) {
      setIsActive(true);
      setStartTime(Date.now());
      setTranscript([]);
      setMetrics(getInitialMetrics());
      setScore(50);
      setCoachTip(null);
      sessionIdRef.current = generateSessionId();

      // Initialize Tone Analyzer
      if (stream) {
        toneAnalyzerRef.current = createToneAnalyzer();
        toneAnalyzerRef.current.initialize(stream).then(() => {
          console.log('🎵 Tone analyzer initialized');
          toneAnalyzerRef.current?.start({
            onToneUpdate: (tone) => {
              currentToneRef.current = tone;
              console.log('🎵 Tone update:', tone);
            },
          });
        });
      }

      // Initialize Wispr (speech recognition)
      wisprRef.current = createWisprFlow();
      wisprRef.current.start({
        onTranscript: (segment) => {
          const segmentWithTone = {
            ...segment,
            tone: { ...currentToneRef.current },
          };
          
          setTranscript((prev) => {
            if (segmentWithTone.isFinal) {
              const filtered = prev.filter((s) => s.isFinal);
              return [...filtered, segmentWithTone];
            }
            const finals = prev.filter((s) => s.isFinal);
            return [...finals, segmentWithTone];
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
      if (video) {
        overshootRef.current.initialize(video as HTMLVideoElement).then(() => {
          overshootRef.current?.start({
            onSignals: (signals) => {
              setMetrics((prev) => ({
                ...prev,
                eye_contact_pct: signals.eye_contact_pct,
                motion_energy: signals.motion_energy,
              }));
            },
          });
        });
      }

      // Start periodic coaching tips
      coachTimerRef.current = setInterval(fetchCoachTip, 5000);
      setTimeout(fetchCoachTip, 3000);
      return;
    }

    // For presentation types that support context, show modal first (if not already shown)
    if (contextTypes.includes(type) && !showContextModal && sessionContext === '') {
      setShowContextModal(true);
      return;
    }

    // For behavioral and technical interviews, show setup modal first
    if (mode === 'interview' && interviewTypesWithSetup.includes(type) && !showInterviewSetup && !interviewSetupData) {
      setShowInterviewSetup(true);
      return;
    }

    if (mode === 'interview' && type === 'programming') setShowCodingSection(true);

    setIsActive(true);
    setStartTime(Date.now());
    setTranscript([]);
    setMetrics(getInitialMetrics());
    setScore(50);  // Start neutral
    setCoachTip(null);
    sessionIdRef.current = generateSessionId();

    // Initialize Tone Analyzer (audio prosody analysis)
    if (stream) {
      toneAnalyzerRef.current = createToneAnalyzer();
      toneAnalyzerRef.current.initialize(stream).then(() => {
        console.log('Tone analyzer initialized');
        toneAnalyzerRef.current?.start({
          onToneUpdate: (tone) => {
            currentToneRef.current = tone;
            console.log('Tone update:', tone);
          },
        });
      });
    }

    // Initialize Wispr (speech recognition)
    wisprRef.current = createWisprFlow();
    wisprRef.current.start({
      onTranscript: (segment) => {
        // Attach current tone to the segment
        const segmentWithTone = {
          ...segment,
          tone: { ...currentToneRef.current },
        };
        
        setTranscript((prev) => {
          // Replace pending segments, add final ones
          if (segmentWithTone.isFinal) {
            const filtered = prev.filter((s) => s.isFinal);
            return [...filtered, segmentWithTone];
          }
          const finals = prev.filter((s) => s.isFinal);
          return [...finals, segmentWithTone];
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
    console.log('Looking for video element:', video ? 'FOUND' : 'NOT FOUND');
    if (video) {
      console.log('Initializing OverShoot with video element...');
      overshootRef.current.initialize(video as HTMLVideoElement).then(() => {
        console.log('OverShoot initialized, starting analysis...');
        overshootRef.current?.start({
          onSignals: (signals) => {
            console.log('OverShoot signals received:', signals);
            setMetrics((prev) => ({
              ...prev,
              eye_contact_pct: signals.eye_contact_pct,
              motion_energy: signals.motion_energy,
            }));
          },
        });
      }).catch((err) => {
        console.error('OverShoot initialization failed:', err);
      });
    } else {
      console.warn('No video element found - OverShoot body language analysis disabled');
    }

    // Start periodic coaching tips - more frequently for better feedback
    coachTimerRef.current = setInterval(fetchCoachTip, 5000);  // Every 5 seconds
    // Fetch first tip after 3 seconds
    setTimeout(fetchCoachTip, 3000);
  }, [stream, skipCamera, fetchCoachTip, type, mode, sessionContext, showContextModal, showInterviewSetup, interviewSetupData, isFollowUpSession]);

  // Handle interview setup completion
  const handleInterviewSetupComplete = (setupData: InterviewSetupData) => {
    setInterviewSetupData(setupData);
    setShowInterviewSetup(false);
    // Build context from interview setup
    const questionContext = `Question: ${setupData.selectedQuestion.question}`;
    setSessionContext(questionContext);
    // Now start the actual session
    startSessionAfterSetup();
  };

  // Start session after modal setup (shared logic)
  const startSessionAfterSetup = useCallback(() => {
    if (mode === 'interview' && type === 'programming') setShowCodingSection(true);

    setIsActive(true);
    setStartTime(Date.now());
    setTranscript([]);
    setMetrics(getInitialMetrics());
    setScore(50);
    setCoachTip(null);
    sessionIdRef.current = generateSessionId();

    // Initialize Tone Analyzer
    if (stream) {
      toneAnalyzerRef.current = createToneAnalyzer();
      toneAnalyzerRef.current.initialize(stream).then(() => {
        console.log('Tone analyzer initialized');
        toneAnalyzerRef.current?.start({
          onToneUpdate: (tone) => {
            currentToneRef.current = tone;
            console.log('Tone update:', tone);
          },
        });
      });
    }

    // Initialize Wispr
    wisprRef.current = createWisprFlow();
    wisprRef.current.start({
      onTranscript: (segment) => {
        const segmentWithTone = {
          ...segment,
          tone: { ...currentToneRef.current },
        };
        
        setTranscript((prev) => {
          if (segmentWithTone.isFinal) {
            const filtered = prev.filter((s) => s.isFinal);
            return [...filtered, segmentWithTone];
          }
          const finals = prev.filter((s) => s.isFinal);
          return [...finals, segmentWithTone];
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

    // Initialize OverShoot
    overshootRef.current = createOverShootAnalyzer();
    const video = document.querySelector('video');
    if (video) {
      overshootRef.current.initialize(video as HTMLVideoElement).then(() => {
        overshootRef.current?.start({
          onSignals: (signals) => {
            setMetrics((prev) => ({
              ...prev,
              eye_contact_pct: signals.eye_contact_pct,
              motion_energy: signals.motion_energy,
            }));
          },
        });
      });
    }

    // Start periodic coaching tips
    coachTimerRef.current = setInterval(fetchCoachTip, 5000);
    setTimeout(fetchCoachTip, 3000);
  }, [stream, mode, type, fetchCoachTip]);

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
    if (toneAnalyzerRef.current) {
      toneAnalyzerRef.current.stop();
    }
    if (coachTimerRef.current) {
      clearInterval(coachTimerRef.current);
    }

    // Get full transcript
    const fullTranscript = transcript
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');

    // Get enriched transcript with paralinguistic data
    const enrichedTranscript = transcript.filter((s) => s.isFinal);

    // Get coding data if this is a programming interview
    let codingData: CodingSessionData | undefined;
    if (showCodingSection && codingQuestionRef.current) {
      codingData = codingQuestionRef.current.getCodingData();
      console.log('Coding data collected:', codingData);
    }

    // Save session to localStorage
    const session = {
      id: sessionIdRef.current,
      mode,
      type,
      context: sessionContext,
      interviewSetup: interviewSetupData || undefined,
      startTime: startTime || Date.now(),
      endTime: Date.now(),
      duration: elapsedTime,
      finalScore: score,
      metrics,
      transcript: fullTranscript,
      enrichedTranscript,
      codingData,
      report: null,
    };

    saveSession(session);

    // Navigate to report page
    router.push(`/report?id=${sessionIdRef.current}`);
  }, [transcript, mode, type, sessionContext, interviewSetupData, startTime, elapsedTime, score, metrics, router, showCodingSection]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle starting session after context is provided
  const handleContextSubmit = () => {
    setShowContextModal(false);
    // Reset pitch mode state
    setPitchMode(null);
    setRandomProduct(null);
    setRandomCategory('');
    
    // Now actually start the session
    if (mode === 'interview' && type === 'programming') setShowCodingSection(true);

    setIsActive(true);
    setStartTime(Date.now());
    setTranscript([]);
    setMetrics(getInitialMetrics());
    setScore(50);
    setCoachTip(null);
    sessionIdRef.current = generateSessionId();

    // Initialize Tone Analyzer
    if (stream) {
      toneAnalyzerRef.current = createToneAnalyzer();
      toneAnalyzerRef.current.initialize(stream).then(() => {
        console.log('Tone analyzer initialized');
        toneAnalyzerRef.current?.start({
          onToneUpdate: (tone) => {
            currentToneRef.current = tone;
            console.log('Tone update:', tone);
          },
        });
      });
    }

    // Initialize Wispr
    wisprRef.current = createWisprFlow();
    wisprRef.current.start({
      onTranscript: (segment) => {
        const segmentWithTone = {
          ...segment,
          tone: { ...currentToneRef.current },
        };
        
        setTranscript((prev) => {
          if (segmentWithTone.isFinal) {
            const filtered = prev.filter((s) => s.isFinal);
            return [...filtered, segmentWithTone];
          }
          const finals = prev.filter((s) => s.isFinal);
          return [...finals, segmentWithTone];
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

    // Initialize OverShoot
    overshootRef.current = createOverShootAnalyzer();
    const video = document.querySelector('video');
    if (video) {
      overshootRef.current.initialize(video as HTMLVideoElement).then(() => {
        overshootRef.current?.start({
          onSignals: (signals) => {
            setMetrics((prev) => ({
              ...prev,
              eye_contact_pct: signals.eye_contact_pct,
              motion_energy: signals.motion_energy,
            }));
          },
        });
      });
    }

    // Start periodic coaching tips
    coachTimerRef.current = setInterval(fetchCoachTip, 5000);
    setTimeout(fetchCoachTip, 3000);
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
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-blue-950">
      {/* Interview Setup Modal for Behavioral and Technical Interviews */}
      {showInterviewSetup && (type === 'behavioral' || type === 'technical') && (
        <InterviewSetupModal
          type={type as 'behavioral' | 'technical'}
          onComplete={handleInterviewSetupComplete}
          onCancel={() => setShowInterviewSetup(false)}
        />
      )}

      {/* Context Modal for Presentations */}
      {showContextModal && type !== 'pitch' && (() => {
        const modalContent = getContextModalContent();
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-lg w-full">
              <h2 className="text-2xl font-bold mb-2">{modalContent.title}</h2>
              <p className="text-gray-400 mb-6">
                {modalContent.description}
              </p>
              
              <textarea
                value={sessionContext}
                onChange={(e) => setSessionContext(e.target.value)}
                placeholder={modalContent.placeholder}
                className="w-full h-32 bg-gray-800 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowContextModal(false);
                    setSessionContext('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContextSubmit}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white"
                >
                  {sessionContext.trim() ? 'Start Session' : 'Skip & Start'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pitch Modal - Special two-option modal for sales pitch */}
      {showContextModal && type === 'pitch' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-lg w-full">
            {/* Mode Selection */}
            {!pitchMode && (
              <>
                <h2 className="text-2xl font-bold mb-2">Choose your pitch challenge</h2>
                <p className="text-gray-400 mb-6">
                  Practice pitching your own product, or challenge yourself with a random one!
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setPitchMode('own')}
                    className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
                  >
                    <h3 className="font-semibold text-white mb-1">Pitch Your Product</h3>
                    <p className="text-gray-400 text-sm">Describe what you&apos;re selling for tailored coaching</p>
                  </button>
                  
                  <button
                    onClick={() => setPitchMode('random')}
                    className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left"
                  >
                    <h3 className="font-semibold text-white mb-1">Random Product Challenge</h3>
                    <p className="text-gray-400 text-sm">Get a random product to pitch on the spot</p>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowContextModal(false);
                    setPitchMode(null);
                  }}
                  className="w-full mt-4 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {/* Own Product Mode */}
            {pitchMode === 'own' && (
              <>
                <button
                  onClick={() => setPitchMode(null)}
                  className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">What are you selling?</h2>
                <p className="text-gray-400 mb-6">
                  Describe your product or service for more relevant coaching.
                </p>
                
                <textarea
                  value={sessionContext}
                  onChange={(e) => setSessionContext(e.target.value)}
                  placeholder="e.g., A SaaS platform for small business accounting, a new energy drink targeting athletes, a luxury smartwatch with health monitoring..."
                  className="w-full h-32 bg-gray-800 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowContextModal(false);
                      setSessionContext('');
                      setPitchMode(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContextSubmit}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white"
                  >
                    {sessionContext.trim() ? 'Start Session' : 'Skip & Start'}
                  </button>
                </div>
              </>
            )}

            {/* Random Product Mode */}
            {pitchMode === 'random' && !randomProduct && (
              <>
                <button
                  onClick={() => setPitchMode(null)}
                  className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">Random Product Challenge</h2>
                <p className="text-gray-400 mb-6">
                  Get a completely random product, or specify a category for your challenge.
                </p>
                
                <input
                  type="text"
                  value={randomCategory}
                  onChange={(e) => setRandomCategory(e.target.value)}
                  placeholder="Category (optional): car, tech, food, fitness, luxury..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowContextModal(false);
                      setPitchMode(null);
                      setRandomCategory('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => fetchRandomProduct(randomCategory)}
                    disabled={loadingProduct}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
                  >
                    {loadingProduct ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Generating...
                      </span>
                    ) : (
                      'Generate Product'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Random Product Result */}
            {pitchMode === 'random' && randomProduct && (
              <>
                <button
                  onClick={() => {
                    setRandomProduct(null);
                    setSessionContext('');
                  }}
                  className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
                >
                  ← Try Another
                </button>
                <h2 className="text-2xl font-bold mb-2">Your Challenge</h2>
                <p className="text-gray-400 mb-4">
                  Pitch this product as convincingly as you can!
                </p>
                
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-600 mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{randomProduct.product}</h3>
                  <p className="text-gray-300 mb-3">{randomProduct.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {randomProduct.key_features.map((feature, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowContextModal(false);
                      setPitchMode(null);
                      setRandomProduct(null);
                      setRandomCategory('');
                      setSessionContext('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContextSubmit}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    Start Pitching!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
          >
            End Session
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={!stream && !skipCamera}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session
          </button>
        )}
      </Navbar>

      {/* For programming interviews */}
      {showCodingSection && <CodingQuestion ref={codingQuestionRef} sessionStartTime={startTime} demoQ={selectedCodingQuestion} />}

      {/* Main Content */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Video */}
        <div className="lg:col-span-2 space-y-4">
          {/* Follow-up Session Indicator */}
          {isFollowUp && (
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30">
              <h3 className="text-sm font-medium text-purple-400 mb-2">Follow-up Question:</h3>
              <p className="text-white text-lg">{followUpQuestion}</p>
              <p className="text-gray-400 text-xs mt-2">Building on your previous response to provide deeper practice</p>
            </div>
          )}

          {/* Interview Question Display */}
          {interviewSetupData && !isFollowUp && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Your Question:</h3>
              <p className="text-white text-lg">{interviewSetupData.selectedQuestion.question}</p>
              {interviewSetupData.selectedQuestion.context && (
                <p className="text-gray-400 text-sm mt-2">💡 {interviewSetupData.selectedQuestion.context}</p>
              )}
            </div>
          )}

          {/* Pitch Item Display */}
          {mode === 'presentation' && type === 'pitch' && (
            <PitchItemBar product={randomProduct} context={sessionContext} />
          )}

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
