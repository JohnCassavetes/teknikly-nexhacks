'use client';

import { useState, useCallback } from 'react';
import pdfToText from 'react-pdftotext';
import { InterviewQuestionSource, InterviewQuestion, InterviewSetupData } from '@/lib/types';
import { getExcludedQuestions, addExcludedQuestions } from '@/lib/storage';

interface InterviewSetupModalProps {
  type: 'behavioral' | 'technical';
  onComplete: (setupData: InterviewSetupData) => void;
  onCancel: () => void;
}

type SetupStep = 'source' | 'input' | 'questions';

export default function InterviewSetupModal({ type, onComplete, onCancel }: InterviewSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('source');
  const [source, setSource] = useState<InterviewQuestionSource | null>(null);
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [resumeHighlights, setResumeHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [excludedQuestions, setExcludedQuestions] = useState<string[]>([]);

  // Handle file upload for resume
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      if (file.type === 'text/plain') {
        const text = await file.text();
        setResume(text);
      } else if (file.type === 'application/pdf') {
        // Extract text from PDF using react-pdftotext
        const text = await pdfToText(file);
        setResume(text);
      } else {
        setError('Please upload a .txt or .pdf file');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      setError('Failed to extract text from PDF. Please try another file or paste your resume text directly.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch questions from API
  const generateQuestions = useCallback(async () => {
    setLoading(true);
    setError('');

    // Get previously excluded questions from storage
    const storedExcluded = getExcludedQuestions(type);
    const allExcluded = [...new Set([...storedExcluded, ...excludedQuestions])];

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          source,
          resume: resume || undefined,
          jobDescription: jobDescription || undefined,
          excludedQuestions: allExcluded.length > 0 ? allExcluded : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
      if (data.resumeHighlights) {
        setResumeHighlights(data.resumeHighlights);
      }
      setStep('questions');
    } catch (err) {
      setError('Failed to generate questions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type, source, resume, jobDescription, excludedQuestions]);

  // Handle selecting a question
  const handleSelectQuestion = (question: InterviewQuestion) => {
    // Add unselected questions to excluded list
    const unselected = questions.filter(q => q.id !== question.id).map(q => q.question);
    addExcludedQuestions(type, unselected);

    onComplete({
      source: source!,
      resume: resume || undefined,
      jobDescription: jobDescription || undefined,
      selectedQuestion: question,
      excludedQuestions: [...excludedQuestions, ...unselected],
    });
  };

  // Handle regenerating questions (user doesn't like any)
  const handleRegenerateQuestions = () => {
    // Add all current questions to excluded list
    const currentQuestions = questions.map(q => q.question);
    setExcludedQuestions(prev => [...prev, ...currentQuestions]);
    addExcludedQuestions(type, currentQuestions);
    // Generate new questions
    generateQuestions();
  };

  // Handle moving to input step
  const handleSourceSelect = (selectedSource: InterviewQuestionSource) => {
    setSource(selectedSource);
    if (selectedSource === 'surprise_me') {
      // Skip input step for surprise me
      setStep('questions');
      // Immediately generate questions
      setTimeout(() => {
        setLoading(true);
        fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            source: selectedSource,
            excludedQuestions: getExcludedQuestions(type),
          }),
        })
          .then(res => res.json())
          .then(data => {
            setQuestions(data.questions);
            if (data.resumeHighlights) {
              setResumeHighlights(data.resumeHighlights);
            }
          })
          .catch(() => setError('Failed to generate questions'))
          .finally(() => setLoading(false));
      }, 0);
    } else {
      setStep('input');
    }
  };

  const typeLabel = type === 'behavioral' ? 'Behavioral' : 'Technical';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Step 1: Source Selection */}
        {step === 'source' && (
          <>
            <h2 className="text-2xl font-bold mb-2">Customize Your {typeLabel} Interview</h2>
            <p className="text-gray-400 mb-6">
              Choose how you want to generate interview questions
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSourceSelect('resume')}
                className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
              >
                <h3 className="font-semibold text-white mb-1">📄 Upload Your Resume</h3>
                <p className="text-gray-400 text-sm">
                  Generate questions based on your experience. Get feedback on how well you highlighted your background.
                </p>
              </button>

              <button
                onClick={() => handleSourceSelect('job_description')}
                className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left"
              >
                <h3 className="font-semibold text-white mb-1">💼 Enter Job Description</h3>
                <p className="text-gray-400 text-sm">
                  Generate questions tailored to a specific job you&apos;re applying for.
                </p>
              </button>

              <button
                onClick={() => handleSourceSelect('surprise_me')}
                className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-green-500 hover:bg-green-500/10 transition-all text-left"
              >
                <h3 className="font-semibold text-white mb-1">🎲 Surprise Me</h3>
                <p className="text-gray-400 text-sm">
                  Get random {typeLabel.toLowerCase()} interview questions to practice with.
                </p>
              </button>
            </div>

            <button
              onClick={onCancel}
              className="w-full mt-6 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {/* Step 2: Input (Resume or Job Description) */}
        {step === 'input' && (
          <>
            <button
              onClick={() => setStep('source')}
              className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
            >
              ← Back
            </button>

            {source === 'resume' && (
              <>
                <h2 className="text-2xl font-bold mb-2">Upload Your Resume</h2>
                <p className="text-gray-400 mb-6">
                  Upload a file or paste your resume text. This will be used to generate personalized questions and provide feedback.
                </p>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:border-gray-500 transition-colors">
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <div className="text-3xl mb-2">📄</div>
                      <p className="text-gray-400">Click to upload (.txt or .pdf)</p>
                    </label>
                  </div>

                  <div className="text-center text-gray-500">or paste your resume below</div>

                  <textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="Paste your resume text here..."
                    className="w-full h-48 bg-gray-800 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </>
            )}

            {source === 'job_description' && (
              <>
                <h2 className="text-2xl font-bold mb-2">Enter Job Description</h2>
                <p className="text-gray-400 mb-6">
                  Paste the job description you&apos;re preparing for. Questions will be tailored to this role.
                </p>

                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="w-full h-48 bg-gray-800 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors mb-4"
                />

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <h4 className="font-medium text-sm mb-2">📄 Optional: Add your resume for better feedback</h4>
                  <textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="Paste your resume text here (optional)..."
                    className="w-full h-24 bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-red-400 text-sm mt-4">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateQuestions}
                disabled={loading || (source === 'resume' && !resume) || (source === 'job_description' && !jobDescription)}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Generating...
                  </span>
                ) : (
                  'Generate Questions'
                )}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Question Selection */}
        {step === 'questions' && (
          <>
            {source !== 'surprise_me' && (
              <button
                onClick={() => setStep('input')}
                className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
              >
                ← Back
              </button>
            )}
            {source === 'surprise_me' && (
              <button
                onClick={() => setStep('source')}
                className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
              >
                ← Back
              </button>
            )}

            <h2 className="text-2xl font-bold mb-2">Choose Your Question</h2>
            <p className="text-gray-400 mb-6">
              Select one question to practice answering. You can regenerate if you don&apos;t like these options.
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></span>
                <p className="text-gray-400">Generating questions...</p>
              </div>
            ) : (
              <>
                {resumeHighlights && resumeHighlights.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                    <h4 className="font-medium text-blue-400 text-sm mb-2">Key points from your resume:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {resumeHighlights.slice(0, 3).map((highlight, i) => (
                        <li key={i}>• {highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {questions.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => handleSelectQuestion(question)}
                      className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left group"
                    >
                      <p className="text-white mb-2">{question.question}</p>
                      {question.context && (
                        <p className="text-gray-500 text-sm group-hover:text-gray-400">
                          💡 {question.context}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-red-400 text-sm mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerateQuestions}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Generating...
                      </span>
                    ) : (
                      'Generate New Questions'
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
