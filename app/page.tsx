'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ModePicker from '@/components/ModePicker';
import { Mode } from '@/lib/types';

// Presentation types
export const presentationTypes = [
  { id: 'pitch', label: 'Sales Pitch', description: 'Investor or sales pitch' },
  { id: 'business', label: 'Business', description: 'Showcase your product/service' },
  { id: 'comedy', label: 'Stand-up Comedy', description: 'Make your audience laugh' },
  { id: 'school', label: 'School Project', description: 'School project presentation' },
] as const;

// Interview types
export const interviewTypes = [
  { id: 'programming', label: 'Coding', description: 'Coding or technical assessment' },
  { id: 'behavioral', label: 'Behavioral', description: 'Culture fit and experience' },
  { id: 'technical', label: 'Technical', description: 'Verbal technical questions' },
] as const;

export default function Home() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  const handleStart = () => {
    if (selectedMode) {
      router.push(`${selectedMode}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar>
      </Navbar>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-5">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Master Your{' '}
            <span className="bg-gradient-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent">
              Communication
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time AI coaching speaking. Master your presentation and interview skills today with&nbsp;
            <span className="bg-gradient-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent font-bold">
              Teknikly
            </span>
            .
          </p>
        </div>

        {/* Mode Selection */}
        <div className="w-full max-w-3xl mb-8">
          <h3 className="text-lg text-gray-400 text-center mb-6">
            Practice for free today
          </h3>
          <ModePicker selectedMode={selectedMode} onSelect={setSelectedMode} />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedMode}
          className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all cursor-pointer ${
            selectedMode
              ? 'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
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
