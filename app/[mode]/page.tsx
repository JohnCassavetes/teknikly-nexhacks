'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { presentationTypes, interviewTypes } from '@/app/page';
import { Mode } from '@/lib/types';

// Valid modes for static generation
const validModes = ['presentation', 'interview'] as const;

// Page for selecting presentation or interview types
export default function ModeTypePage() {
  const params = useParams();
  const router = useRouter();
  const mode = params.mode as Mode;
  const [selectedType, setSelectedType] = useState<string>('');

  // Validate mode and redirect if invalid
  useEffect(() => {
    if (mode !== 'presentation' && mode !== 'interview') {
      router.push('/');
    }
  }, [mode, router]);

  const handleStart = () => {
    if (selectedType) {
      router.push(`/practice?mode=${mode}&type=${selectedType}`);
    }
  };

  // Select the appropriate types based on mode
  const types = mode === 'presentation' ? presentationTypes : interviewTypes;
  const modeLabel = mode === 'presentation' ? 'Presentation' : 'Interview';

  function getColours(id: string): string {
    if (id === "pitch") {
      return "border-yellow-500 bg-yellow-500/10"
    } else if (id === "business") {
      return "border-teal-500 bg-teal-500/10"
    } else if (id === "comedy") {
      return "border-fuchsia-500 bg-fuchsia-500/10"
    } else if (id === "school") {
      return "border-orange-500 bg-orange-500/10"
    } else if (id === "programming") {
      return "border-green-500 bg-green-500/10"
    } else if (id === "behavioral") {
      return "border-purple-500 bg-purple-500/10"
    } else if (id === "technical") {
      return "border-amber-500 bg-amber-500/10"
    } else return "border-blue-500 bg-blue-500/10";
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-blue-950">
      <Navbar>
      </Navbar>

      <section className="flex-1 flex flex-col items-center justify-center p-1">
        <div className="flex flex-col gap-4 justify-center items-center w-full max-w-3xl mb-8">
          <h3 className="text-2xl text-gray-400 text-center mb-2">
            Select your {modeLabel.toLowerCase()} type
          </h3>

          <div className={`grid grid-cols-1 ${types.length % 2 === 0 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4 max-w-2xl mx-auto`}>
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-6 rounded-xl border-2 text-left hover:-translate-y-1 transition duration-200 flex flex-col gap-3 ${selectedType === type.id
                    ? getColours(type.id)
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer'
                  }`}
              >
                {type.icon}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {type.label}
                  </h3>
                  <p className="text-gray-400 text-sm">{type.description}</p>
                </div>


              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a href="/" className="px-8 py-3 rounded-xl text-lg font-semibold transition-all cursor-pointer
              text-white text-center border border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20
            ">
              Back to Home
            </a>

            <button
              onClick={handleStart}
              disabled={selectedType === ''}
              className={`px-8 py-3 rounded-xl text-lg font-semibold transition-all cursor-pointer ${selectedType !== ''
                  ? 'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
            >
              Start practicing
            </button>

          </div>
        </div>
      </section>
    </main>
  );
}
