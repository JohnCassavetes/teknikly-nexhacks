'use client';

import { Mode } from '@/lib/types';

interface ModePickerProps {
  selectedMode: Mode | null;
  onSelect: (mode: Mode) => void;
}

const MODES: { id: Mode; label: string; description: string; icon: string }[] = [
  {
    id: 'presentation',
    label: 'Presentation',
    description: 'Practice your pitch, speech, or demo',
    icon: '🎤',
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Prepare for job interviews or meetings',
    icon: '💼',
  },
];

export default function ModePicker({ selectedMode, onSelect }: ModePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
      {/* {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelect(mode.id)}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            selectedMode === mode.id
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
          }`}
        >
          <div className="text-4xl mb-3">{mode.icon}</div>
          <h3 className="text-xl font-semibold text-white mb-2">{mode.label}</h3>
          <p className="text-gray-400 text-sm">{mode.description}</p>
        </button>
      ))} */}
      <button
        onClick={() => onSelect('presentation')}
        className={`p-6 rounded-xl border-2 text-left transition duration-200
          hover:-translate-y-1
          ${
          selectedMode === 'presentation'
            ? 'border-emerald-700 bg-emerald-500/20'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
        }`}
      >
        {/* <div className="text-4xl mb-3">🎤</div> */}
        <h3 className="text-xl font-semibold text-white mb-2">Presentation</h3>
        <p className="text-gray-400 text-sm">Practice your pitch, speech, or demo</p>
      </button>

      <button
        onClick={() => onSelect('interview')}
        className={`p-6 rounded-xl border-2 text-left transition duration-200 
          hover:-translate-y-1
          ${
            selectedMode === 'interview'
              ? 'border-indigo-400 bg-indigo-500/20'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
        }`}
      >
        {/* <div className="text-4xl mb-3">💼</div> */}
        <h3 className="text-xl font-semibold text-white mb-2">Interview</h3>
        <p className="text-gray-400 text-sm">Prepare for job interviews</p>
      </button>
    </div>
  );
}
