// TalkCoach Types

export type Mode = 'presentation' | 'interview';

export interface Metrics {
  pace_wpm: number;
  filler_rate_per_min: number;
  eye_contact_pct: number;
  max_pause_ms: number;
  motion_energy: number;
  pause_count: number;
}

export interface BodySignals {
  eye_contact_pct: number;
  motion_energy: number;
}

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface CoachTip {
  tip: string;
  priority: 'pace' | 'fillers' | 'eye_contact' | 'pauses' | 'energy';
}

export interface SessionReport {
  overall_summary: string;
  strengths: string[];
  improvements: string[];
  next_goal: string;
}

export interface Session {
  id: string;
  mode: Mode;
  type?: string; // Sub-category like 'comedy', 'pitch', 'technical', etc.
  startTime: number;
  endTime: number;
  duration: number;
  finalScore: number;
  metrics: Metrics;
  transcript: string;
  report: SessionReport | null;
}

export interface SessionState {
  isActive: boolean;
  mode: Mode | null;
  startTime: number | null;
  transcript: TranscriptSegment[];
  metrics: Metrics;
  score: number;
  currentTip: CoachTip | null;
}

// Scoring thresholds from README
export const THRESHOLDS = {
  pace: { min: 140, max: 160 },
  fillers: { max: 2 },
  eye_contact: { min: 0.7 },
  max_pause: { max: 2000 },
  motion_energy: { min: 0.3, max: 0.6 },
};

// Score weights from README
export const WEIGHTS = {
  pace: 0.25,
  fillers: 0.25,
  eye_contact: 0.25,
  pauses: 0.15,
  motion_energy: 0.10,
};
