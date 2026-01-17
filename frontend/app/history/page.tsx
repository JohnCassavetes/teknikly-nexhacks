'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScoreGauge from '@/components/ScoreGauge';
import { getSessions, deleteSession, clearAllSessions } from '@/lib/storage';
import { Session } from '@/lib/types';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSession(id);
      setSessions(getSessions());
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL sessions? This cannot be undone.')) {
      clearAllSessions();
      setSessions([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <main className="min-h-screen flex flex-col">
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
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Session History</h1>
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold mb-2">No sessions yet</h2>
              <p className="text-gray-400 mb-6">
                Start a practice session to see your history here.
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Start Practicing
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <ScoreGauge score={session.finalScore} size="sm" />

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">{session.mode}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">{formatDuration(session.duration)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(session.startTime)}
                      </div>
                    </div>

                    {/* Metrics Preview */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-400">
                      <div>
                        <span className="text-gray-500">Pace:</span>{' '}
                        {session.metrics.pace_wpm} WPM
                      </div>
                      <div>
                        <span className="text-gray-500">Eye:</span>{' '}
                        {Math.round(session.metrics.eye_contact_pct * 100)}%
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/report?id=${session.id}`)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete session"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
