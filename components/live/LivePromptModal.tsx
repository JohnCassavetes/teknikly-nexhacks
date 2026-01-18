'use client';

import { useState } from 'react';

interface LivePromptModalProps {
    onSubmit: (prompt: string) => void;
}

const EXAMPLE_PROMPTS = [
    'Practice pitching my AI startup to investors',
    'Prepare for a software engineering interview',
    'Practice my wedding toast speech',
    'Rehearse a sales call for my product',
];

export default function LivePromptModal({ onSubmit }: LivePromptModalProps) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = () => {
        if (prompt.trim()) {
            onSubmit(prompt.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-lg w-full animate-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="text-5xl mb-4">🎙️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Start Live Session</h2>
                    <p className="text-gray-400">
                        What would you like to practice today?
                    </p>
                </div>

                <div className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe what you want to practice..."
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-white placeholder-gray-500"
                        autoFocus
                    />

                    <div className="space-y-2">
                        <p className="text-sm text-gray-500">Try one of these:</p>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_PROMPTS.map((example, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPrompt(example)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!prompt.trim()}
                        className={`w-full py-4 rounded-xl text-lg font-semibold transition-all ${prompt.trim()
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Start Session
                    </button>
                </div>
            </div>
        </div>
    );
}
