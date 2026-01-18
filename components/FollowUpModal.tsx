'use client';

import { useState, useEffect } from 'react';
import { Session, FollowUpResponse, InterviewSetupData } from '@/lib/types';

interface FollowUpModalProps {
  session: Session;
  onStartFollowUp: (followUpQuestion: FollowUpResponse) => void;
  onCancel: () => void;
}

export default function FollowUpModal({ session, onStartFollowUp, onCancel }: FollowUpModalProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState<FollowUpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateFollowUp();
  }, []);

  const generateFollowUp = async () => {
    setLoading(true);
    setError('');

    try {
      // Determine the previous question
      let previousQuestion = '';
      if (session.interviewSetup?.selectedQuestion) {
        previousQuestion = session.interviewSetup.selectedQuestion.question;
      } else if (session.context) {
        previousQuestion = session.context;
      } else {
        previousQuestion = `${session.type || session.mode} practice`;
      }

      const requestBody = {
        mode: session.mode,
        type: session.type,
        context: session.context,
        previousQuestion,
        previousResponse: session.transcript,
        previousMetrics: session.metrics,
        previousScore: session.finalScore,
        resume: session.interviewSetup?.resume,
        jobDescription: session.interviewSetup?.jobDescription,
      };

      console.log('🔄 Generating follow-up:', requestBody);

      const response = await fetch('/api/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate follow-up question');
      }

      const data = await response.json();
      console.log('✅ Follow-up generated:', data);

      setFollowUpQuestion({
        question: data.question,
        context: data.context,
        sessionContext: {
          previousSessionId: session.id,
          previousQuestion,
          previousResponse: session.transcript,
          previousMetrics: session.metrics,
          previousScore: session.finalScore,
        },
      });
    } catch (err) {
      console.error('Error generating follow-up:', err);
      setError('Failed to generate follow-up question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-2xl w-full">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Generating your follow-up question...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={generateFollowUp}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Follow-up Question Display */}
        {followUpQuestion && !loading && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Ready for a follow-up?</h2>
              <p className="text-gray-400">
                Based on your previous response and performance, here's a follow-up question to help you improve further.
              </p>
            </div>

            {/* Previous Performance Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">📊 Previous Performance:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Score</p>
                  <p className="text-white font-semibold">{Math.round(session.finalScore)}/100</p>
                </div>
                <div>
                  <p className="text-gray-500">Pace</p>
                  <p className="text-white font-semibold">{Math.round(session.metrics.pace_wpm)} WPM</p>
                </div>
                <div>
                  <p className="text-gray-500">Fillers</p>
                  <p className="text-white font-semibold">{Math.round(session.metrics.filler_rate_per_min * 10) / 10}/min</p>
                </div>
                <div>
                  <p className="text-gray-500">Eye Contact</p>
                  <p className="text-white font-semibold">{Math.round(session.metrics.eye_contact_pct * 100)}%</p>
                </div>
              </div>
            </div>

            {/* Question Display */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 mb-6 border border-blue-500/30">
              <h3 className="text-sm font-medium text-blue-400 mb-3">Your Follow-up Question:</h3>
              <p className="text-white text-lg font-medium mb-3">{followUpQuestion.question}</p>
              {followUpQuestion.context && (
                <p className="text-gray-400 text-sm">💡 {followUpQuestion.context}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white font-medium"
              >
                Back to Report
              </button>
              <button
                onClick={() => onStartFollowUp(followUpQuestion)}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-lg transition-colors text-white font-medium"
              >
                Try Follow-up Question
              </button>
            </div>

            {/* Generate Different Question Option */}
            <button
              onClick={generateFollowUp}
              className="w-full mt-3 px-4 py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              ↻ Generate Different Question
            </button>
          </>
        )}
      </div>
    </div>
  );
}
