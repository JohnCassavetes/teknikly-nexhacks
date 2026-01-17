'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ModePicker from '@/components/ModePicker';
import { Mode } from '@/lib/types';

// Page for selecting presentation types
export default function Presentations() {
    const router = useRouter();
    const [selectedMode, setSelectedMode] = useState<string>("");

    const handleStart = () => {
        if (selectedMode) {
        router.push(`/practice?mode=${selectedMode}`);
        }
    };

    const presentationTypes = [
        {
            name: 'Business',
            desc: 'Conference presentations'
        },
        {
            name: 'Comedy',
            desc: 'Stand-up comedy presentations'
        },
        {
            name: 'School',
            desc: 'School presentations'
        },
        {
            name: 'Sales',
            desc: 'Sales pitches'
        }
    ]

    return (
        <main className="min-h-screen flex flex-col">
        {/* Header */}
        <Navbar>
        </Navbar>

        <section className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="flex flex-col gap-4 justify-center items-center w-full max-w-3xl mb-8">
                <h3 className="text-lg text-gray-400 text-center mb-6">
                    Select your presentation type
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {presentationTypes.map((presType, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedMode(presType.name)}
                            className={`p-6 rounded-xl border-2 text-left transition-all ${
                                selectedMode === presType.name
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
                            }`}
                        >
                            <h3 className="text-xl font-semibold text-white mb-2">{presType.name}</h3>
                            <p className="text-gray-400 text-sm">{presType.desc}</p>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => {}}
                    disabled={false}
                    className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all cursor-pointer ${
                        selectedMode !== ""
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Start practicing
                </button>
            </div>
        </section>


        </main>
    );
}

