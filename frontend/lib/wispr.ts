// Wispr Flow wrapper with browser SpeechRecognition fallback

import { TranscriptSegment } from './types';

// Type declarations for browser SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Filler words to detect
const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
  'so', 'well', 'right', 'okay', 'er', 'ah', 'hmm', 'i mean'
];

interface WisprCallbacks {
  onTranscript: (segment: TranscriptSegment) => void;
  onMetricsUpdate: (metrics: {
    pace_wpm: number;
    filler_rate_per_min: number;
    pause_count: number;
    max_pause_ms: number;
  }) => void;
}

class WisprFlow {
  private recognition: SpeechRecognitionInstance | null = null;
  private callbacks: WisprCallbacks | null = null;
  private isRunning = false;

  // Metrics tracking
  private wordCount = 0;
  private fillerCount = 0;
  private pauseCount = 0;
  private maxPauseMs = 0;
  private lastSpeechTime = 0;
  private startTime = 0;
  private segments: TranscriptSegment[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  start(callbacks: WisprCallbacks): void {
    if (!this.recognition) {
      console.warn('SpeechRecognition not available');
      return;
    }

    this.callbacks = callbacks;
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastSpeechTime = this.startTime;
    this.wordCount = 0;
    this.fillerCount = 0;
    this.pauseCount = 0;
    this.maxPauseMs = 0;
    this.segments = [];

    this.recognition.onresult = (event) => {
      const now = Date.now();

      // Check for pause
      const pauseDuration = now - this.lastSpeechTime;
      if (pauseDuration > 1500 && this.lastSpeechTime !== this.startTime) {
        this.pauseCount++;
        if (pauseDuration > this.maxPauseMs) {
          this.maxPauseMs = pauseDuration;
        }
      }
      this.lastSpeechTime = now;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const isFinal = result.isFinal;

        const segment: TranscriptSegment = {
          text,
          timestamp: now,
          isFinal,
        };

        if (isFinal) {
          this.segments.push(segment);

          // Count words
          const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
          this.wordCount += words.length;

          // Count fillers
          const lowerText = text.toLowerCase();
          for (const filler of FILLER_WORDS) {
            const regex = new RegExp(`\\b${filler}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
              this.fillerCount += matches.length;
            }
          }
        }

        this.callbacks?.onTranscript(segment);
      }

      // Update metrics
      this.updateMetrics();
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Don't try to restart here - let onend handle it
      // The 'no-speech' error will trigger onend automatically
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        // Restart if still running (handles no-speech and other interruptions)
        setTimeout(() => {
          if (this.isRunning && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // Already started or other error, ignore
            }
          }
        }, 100);  // Small delay to ensure clean restart
      }
    };

    try {
      this.recognition.start();
    } catch {
      // Already started
    }
  }

  private updateMetrics(): void {
    const elapsedMinutes = (Date.now() - this.startTime) / 60000;
    if (elapsedMinutes < 0.05) return; // Wait at least 3 seconds

    const pace_wpm = Math.round(this.wordCount / elapsedMinutes);
    const filler_rate_per_min = Math.round((this.fillerCount / elapsedMinutes) * 10) / 10;

    this.callbacks?.onMetricsUpdate({
      pace_wpm: Math.min(pace_wpm, 300), // Cap at reasonable max
      filler_rate_per_min,
      pause_count: this.pauseCount,
      max_pause_ms: this.maxPauseMs,
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  getFullTranscript(): string {
    return this.segments
      .filter(s => s.isFinal)
      .map(s => s.text)
      .join(' ');
  }

  getStats() {
    return {
      wordCount: this.wordCount,
      fillerCount: this.fillerCount,
      pauseCount: this.pauseCount,
      maxPauseMs: this.maxPauseMs,
    };
  }
}

// Singleton instance
let instance: WisprFlow | null = null;

export function getWisprFlow(): WisprFlow {
  if (!instance) {
    instance = new WisprFlow();
  }
  return instance;
}

export function createWisprFlow(): WisprFlow {
  return new WisprFlow();
}
