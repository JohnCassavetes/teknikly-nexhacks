// Scoring engine for TalkCoach

import { Metrics, THRESHOLDS, WEIGHTS } from './types';

// Calculate individual signal scores (0-100)

function scorePace(wpm: number): number {
  // No speech yet - return neutral score
  if (wpm === 0) return 50;
  
  const { min, max } = THRESHOLDS.pace;
  if (wpm >= min && wpm <= max) return 100;
  if (wpm < min) {
    // Too slow - score decreases as it gets slower
    const diff = min - wpm;
    return Math.max(0, 100 - diff * 2);
  }
  // Too fast - score decreases as it gets faster
  const diff = wpm - max;
  return Math.max(0, 100 - diff * 2);
}

function scoreFillers(fillerRate: number): number {
  const { max } = THRESHOLDS.fillers;
  if (fillerRate <= max) return 100;
  // Score decreases as fillers increase
  const excess = fillerRate - max;
  return Math.max(0, 100 - excess * 15);
}

function scoreEyeContact(pct: number): number {
  const { min } = THRESHOLDS.eye_contact;
  if (pct >= min) return 100;
  // Score proportional to eye contact
  return Math.max(0, (pct / min) * 100);
}

function scorePauses(maxPauseMs: number): number {
  const { max } = THRESHOLDS.max_pause;
  if (maxPauseMs <= max) return 100;
  // Score decreases for longer pauses
  const excess = maxPauseMs - max;
  return Math.max(0, 100 - (excess / 100));
}

function scoreMotionEnergy(energy: number): number {
  const { min, max } = THRESHOLDS.motion_energy;
  if (energy >= min && energy <= max) return 100;
  if (energy < min) {
    // Too still
    return Math.max(0, (energy / min) * 100);
  }
  // Too much movement
  const excess = energy - max;
  return Math.max(0, 100 - excess * 200);
}

// Calculate overall weighted score
export function calculateScore(metrics: Metrics): number {
  const paceScore = scorePace(metrics.pace_wpm);
  const fillerScore = scoreFillers(metrics.filler_rate_per_min);
  const eyeScore = scoreEyeContact(metrics.eye_contact_pct);
  const pauseScore = scorePauses(metrics.max_pause_ms);
  const energyScore = scoreMotionEnergy(metrics.motion_energy);

  const weighted =
    paceScore * WEIGHTS.pace +
    fillerScore * WEIGHTS.fillers +
    eyeScore * WEIGHTS.eye_contact +
    pauseScore * WEIGHTS.pauses +
    energyScore * WEIGHTS.motion_energy;

  return Math.round(weighted);
}

// Apply smoothing: score = 0.5 * prev + 0.5 * current (faster response)
export function smoothScore(prevScore: number, currentScore: number): number {
  return Math.round(0.5 * prevScore + 0.5 * currentScore);
}

// Determine which coaching cue to show
export type CueType = 'slow_down' | 'reduce_fillers' | 'look_at_camera' | 'project_confidence' | null;

export function getActiveCues(metrics: Metrics): CueType[] {
  const cues: CueType[] = [];

  // Check pace - too fast
  if (metrics.pace_wpm > THRESHOLDS.pace.max + 10) {
    cues.push('slow_down');
  }

  // Check fillers
  if (metrics.filler_rate_per_min > THRESHOLDS.fillers.max + 1) {
    cues.push('reduce_fillers');
  }

  // Check eye contact
  if (metrics.eye_contact_pct < THRESHOLDS.eye_contact.min - 0.1) {
    cues.push('look_at_camera');
  }

  // Check motion energy - too low suggests lack of confidence
  if (metrics.motion_energy < THRESHOLDS.motion_energy.min - 0.1) {
    cues.push('project_confidence');
  }

  // Return only top 2 cues (as per README)
  return cues.slice(0, 2);
}

// Default/initial metrics - start neutral, let real data drive score
export function getInitialMetrics(): Metrics {
  return {
    pace_wpm: 0,           // No speech yet
    filler_rate_per_min: 0,
    eye_contact_pct: 0.5,  // Neutral eye contact
    max_pause_ms: 0,
    motion_energy: 0.3,    // Neutral motion
    pause_count: 0,
  };
}
