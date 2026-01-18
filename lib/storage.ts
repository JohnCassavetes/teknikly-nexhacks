// localStorage helpers for session history

import { Session } from './types';

const SESSIONS_KEY = 'talkcoach_sessions';
const EXCLUDED_QUESTIONS_KEY = 'talkcoach_excluded_questions';

export function getSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getSessions();
    sessions.unshift(session); // Add to beginning (most recent first)
    // Keep only last 20 sessions
    const trimmed = sessions.slice(0, 20);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

export function getSession(id: string): Session | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === id) || null;
}

export function deleteSession(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete session:', e);
  }
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSIONS_KEY);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Excluded questions management (to avoid regenerating rejected questions)
export function getExcludedQuestions(type: 'behavioral' | 'technical'): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${EXCLUDED_QUESTIONS_KEY}_${type}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addExcludedQuestions(type: 'behavioral' | 'technical', questions: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getExcludedQuestions(type);
    const combined = [...new Set([...existing, ...questions])];
    // Keep only last 50 excluded questions to prevent the list from growing too large
    const trimmed = combined.slice(-50);
    localStorage.setItem(`${EXCLUDED_QUESTIONS_KEY}_${type}`, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save excluded questions:', e);
  }
}

export function clearExcludedQuestions(type: 'behavioral' | 'technical'): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${EXCLUDED_QUESTIONS_KEY}_${type}`);
}
