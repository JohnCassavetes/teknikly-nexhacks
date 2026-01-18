'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoPanel from '@/components/VideoPanel';
import ScoreGauge from '@/components/ScoreGauge';
import LiveTranscript from '@/components/LiveTranscript';
import MetricsDisplay from '@/components/MetricsDisplay';
import LivePromptModal from '@/components/live/LivePromptModal';
import VoiceToggle from '@/components/live/VoiceToggle';
import { useTtsQueue } from '@/lib/hooks/useTtsQueue';
import { ConversationTurn, TranscriptSegment, Metrics, ToneInfo } from '@/lib/types';
import { captureLocalMedia, stopMediaStream } from '@/lib/livekit';
import { createWisprFlow } from '@/lib/wispr';
import { createOverShootAnalyzer } from '@/lib/overshoot';
import { createToneAnalyzer } from '@/lib/toneAnalyzer';
import { calculateScore, smoothScore, getInitialMetrics } from '@/lib/scoring';
import { saveSession, generateSessionId } from '@/lib/storage';

type SessionStatus = 'prompt' | 'ai_speaking' | 'listening' | 'processing';

export default function LivePage() {
    const router = useRouter();
    const [status, setStatus] = useState<SessionStatus>('prompt');
    const [prompt, setPrompt] = useState('');
    const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [currentAiMessage, setCurrentAiMessage] = useState('');

    // Media state
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Analysis state (same as practice page)
    const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
    const [metrics, setMetrics] = useState<Metrics>(getInitialMetrics());
    const [score, setScore] = useState(50);

    // TTS
    const { play, stop, isPlaying } = useTtsQueue();

    // Refs for cleanup
    const wisprRef = useRef<ReturnType<typeof createWisprFlow> | null>(null);
    const overshootRef = useRef<ReturnType<typeof createOverShootAnalyzer> | null>(null);
    const toneAnalyzerRef = useRef<ReturnType<typeof createToneAnalyzer> | null>(null);
    const currentToneRef = useRef<ToneInfo>({ volume: 'normal', energy: 'medium', pitchTrend: 'flat' });
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSpeechTimeRef = useRef<number>(Date.now());
    const userResponseRef = useRef<string>('');
    const sessionIdRef = useRef<string>(generateSessionId());
    const startTimeRef = useRef<number | null>(null);

    // Initialize camera on mount
    useEffect(() => {
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
    }, []);

    // Update score when metrics change
    useEffect(() => {
        if (status !== 'prompt') {
            const newScore = calculateScore(metrics);
            setScore((prev) => smoothScore(prev, newScore));
        }
    }, [metrics, status]);

    // Silence detection for auto-response
    useEffect(() => {
        if (status === 'listening') {
            silenceTimerRef.current = setInterval(() => {
                const silenceDuration = Date.now() - lastSpeechTimeRef.current;

                // 3 seconds of silence with content = send response
                if (silenceDuration > 3000 && userResponseRef.current.trim()) {
                    handleUserResponse(userResponseRef.current);
                    userResponseRef.current = '';
                }
            }, 500);
        } else {
            if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        }

        return () => {
            if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
            }
        };
    }, [status]);

    // Handle video element for OverShoot
    const handleVideoElement = useCallback((video: HTMLVideoElement) => {
        if (overshootRef.current) {
            overshootRef.current.initialize(video);
        }
    }, []);

    const startSession = async (userPrompt: string) => {
        setPrompt(userPrompt);
        setStatus('processing');
        setTranscript([]);
        setMetrics(getInitialMetrics());
        setScore(50);
        sessionIdRef.current = generateSessionId();
        startTimeRef.current = Date.now();

        // Initialize analyzers
        if (stream) {
            // Initialize Tone Analyzer
            toneAnalyzerRef.current = createToneAnalyzer();
            toneAnalyzerRef.current.initialize(stream).then(() => {
                console.log('🎵 Tone analyzer initialized');
                toneAnalyzerRef.current?.start({
                    onToneUpdate: (tone) => {
                        currentToneRef.current = tone;
                    },
                });
            });

            // Initialize Wispr for speech recognition
            wisprRef.current = createWisprFlow();
            wisprRef.current.start({
                onTranscript: (segment) => {
                    lastSpeechTimeRef.current = Date.now();

                    const segmentWithTone = {
                        ...segment,
                        tone: { ...currentToneRef.current },
                    };

                    // Track user response for silence detection
                    if (segment.isFinal) {
                        userResponseRef.current += segment.text + ' ';
                    }

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

            // Initialize OverShoot for body language
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
        }

        // Get initial AI message
        try {
            const response = await fetch('/api/live-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    conversationHistory: [],
                    userResponse: '',
                    responseType: 'initial',
                }),
            });

            if (!response.ok) throw new Error('Failed to start session');

            const data = await response.json();
            const aiTurn: ConversationTurn = {
                id: crypto.randomUUID(),
                role: 'ai',
                content: data.message,
                timestamp: Date.now(),
            };

            setConversationHistory([aiTurn]);
            setCurrentAiMessage(data.message);

            if (voiceEnabled) {
                setStatus('ai_speaking');
                const success = await play(data.message);
                if (!success) {
                    console.log('TTS failed, showing text only');
                }
            }

            setStatus('listening');
            lastSpeechTimeRef.current = Date.now();
        } catch (error) {
            console.error('Error starting session:', error);
            setStatus('prompt');
        }
    };

    const handleUserResponse = async (userText: string) => {
        if (!userText.trim()) return;

        setStatus('processing');

        const userTurn: ConversationTurn = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userText,
            timestamp: Date.now(),
        };

        const newHistory = [...conversationHistory, userTurn];
        setConversationHistory(newHistory);

        try {
            const response = await fetch('/api/live-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    conversationHistory: newHistory,
                    userResponse: userText,
                    responseType: 'response',
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();
            const aiTurn: ConversationTurn = {
                id: crypto.randomUUID(),
                role: 'ai',
                content: data.message,
                timestamp: Date.now(),
            };

            setConversationHistory([...newHistory, aiTurn]);
            setCurrentAiMessage(data.message);

            if (voiceEnabled) {
                setStatus('ai_speaking');
                await play(data.message);
            }

            setStatus('listening');
            lastSpeechTimeRef.current = Date.now();
        } catch (error) {
            console.error('Error getting response:', error);
            setStatus('listening');
        }
    };

    const endSession = () => {
        stop();
        if (wisprRef.current) wisprRef.current.stop();
        if (overshootRef.current) overshootRef.current.stop();
        if (toneAnalyzerRef.current) toneAnalyzerRef.current.stop();
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
        if (stream) stopMediaStream(stream);

        // Just go back home - no summary for Live mode
        router.push('/');
    };

    if (permissionDenied) {
        return (
            <main className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="text-6xl mb-4">📷</div>
                    <h1 className="text-2xl font-bold mb-2">Camera Access Required</h1>
                    <p className="text-gray-400 mb-4">
                        Live mode needs access to your camera and microphone for full coaching.
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
        <main className="min-h-screen flex flex-col bg-gray-950">
            <Navbar />

            {status === 'prompt' && (
                <LivePromptModal onSubmit={startSession} />
            )}

            <section className="flex-1 p-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Video + Score */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Video Panel */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                            <VideoPanel stream={stream} onVideoElement={handleVideoElement} />
                        </div>

                        {/* Score Gauge */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
                            <ScoreGauge score={score} />
                        </div>

                        {/* Metrics */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
                            <MetricsDisplay metrics={metrics} />
                        </div>
                    </div>

                    {/* Right Column: Conversation + Transcript */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h1 className="text-xl font-semibold text-white">
                                {prompt ? `${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}` : 'Live Session'}
                            </h1>
                            <VoiceToggle
                                enabled={voiceEnabled}
                                onToggle={() => setVoiceEnabled(!voiceEnabled)}
                                isSpeaking={isPlaying}
                            />
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center justify-center h-24 bg-gray-900/50 rounded-2xl border border-gray-800 relative overflow-hidden">
                            <div className={`absolute inset-0 transition-all duration-500 ${status === 'processing' ? 'bg-yellow-500/10' :
                                status === 'ai_speaking' ? 'bg-amber-500/10' :
                                    status === 'listening' ? 'bg-green-500/10' :
                                        'bg-gray-900/50'
                                }`} />

                            <div className={`w-16 h-16 rounded-full blur-2xl absolute transition-all duration-500 ${status === 'processing' ? 'bg-yellow-500/40 scale-110 animate-pulse' :
                                status === 'ai_speaking' ? 'bg-amber-500/40 scale-125 animate-pulse' :
                                    status === 'listening' ? 'bg-green-500/40 scale-100' :
                                        'bg-gray-600/20 scale-75'
                                }`} />

                            <div className="z-10 text-center">
                                <div className="text-3xl mb-1">
                                    {status === 'processing' && '🤔'}
                                    {status === 'ai_speaking' && '🗣️'}
                                    {status === 'listening' && '👂'}
                                    {status === 'prompt' && '🎙️'}
                                </div>
                                <p className="text-sm font-medium text-gray-300">
                                    {status === 'processing' && 'Thinking...'}
                                    {status === 'ai_speaking' && 'AI Speaking...'}
                                    {status === 'listening' && 'Listening (pause 3s to respond)'}
                                    {status === 'prompt' && 'Ready'}
                                </p>
                            </div>
                        </div>

                        {/* AI Message */}
                        {currentAiMessage && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                <p className="text-amber-200 font-medium text-sm mb-1">AI Coach:</p>
                                <p className="text-white">{currentAiMessage}</p>
                            </div>
                        )}

                        {/* Live Transcript */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
                            <LiveTranscript segments={transcript} maxHeight="200px" showEffects={true} />
                        </div>

                        {/* Manual Response Button - for noisy environments */}
                        {status === 'listening' && (
                            <button
                                onClick={() => {
                                    const currentResponse = userResponseRef.current.trim() ||
                                        transcript.filter(s => s.isFinal).map(s => s.text).join(' ');
                                    if (currentResponse) {
                                        handleUserResponse(currentResponse);
                                        userResponseRef.current = '';
                                    }
                                }}
                                className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-all font-medium"
                            >
                                ✋ I'm done, next question
                            </button>
                        )}

                        {/* End Session */}
                        {status !== 'prompt' && (
                            <button
                                onClick={endSession}
                                className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                End Session
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
