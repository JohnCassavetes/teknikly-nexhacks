'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModePicker from '@/components/ModePicker';
import { Mode } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  const handleStart = () => {
    if (selectedMode) {
      router.push(`/practice?mode=${selectedMode}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 sticky top-0 bg-gray-950/50 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              TalkCoach
            </h1>
          </div>
          <nav>
            <a
              href="/history"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Session History
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Master Your{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Communication
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time AI coaching for public speaking. Analyze your speech, body
            language, and get instant feedback to improve.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="w-full max-w-3xl mb-8">
          <h3 className="text-lg text-gray-400 text-center mb-6">
            Select your practice mode
          </h3>
          <ModePicker selectedMode={selectedMode} onSelect={setSelectedMode} />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedMode}
          className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all ${
            selectedMode
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Start Practice Session
        </button>
      </section>

      {/* Features */}
      <section className="p-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🎤"
              title="Live Transcript"
              description="See your words in real-time with speech analysis"
            />
            <FeatureCard
              icon="📊"
              title="Instant Scoring"
              description="Track pace, fillers, eye contact, and more"
            />
            <FeatureCard
              icon="📝"
              title="Detailed Reports"
              description="Get personalized improvement recommendations"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
