'use client';

import { Mode } from '@/lib/types';
import { MessageSquare, MessagesSquare, Presentation, Mic, Briefcase } from 'lucide-react';

interface ModePickerProps {
  selectedMode: Mode | null;
  onSelect: (mode: Mode) => void;
}

export default function ModePicker({ selectedMode, onSelect }: ModePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
      <button
        onClick={() => onSelect('presentation')}
        className={`p-6 rounded-xl border-2 text-left transition duration-200 flex flex-col gap-3
          hover:-translate-y-1
          ${selectedMode === 'presentation'
            ? 'border-emerald-700 bg-emerald-500/20'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
          }`}
      >
        <Presentation />

        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Presentations</h3>
          <p className="text-gray-400 text-sm">Practice your pitch, speech, or demo</p>
        </div>

      </button>

      <button
        onClick={() => onSelect('interview')}
        className={`p-6 rounded-xl border-2 text-left transition duration-200 flex flex-col gap-3
          hover:-translate-y-1
          ${selectedMode === 'interview'
            ? 'border-indigo-400 bg-indigo-500/20'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
          }`}
      >
        <Briefcase />

        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Interviews</h3>
          <p className="text-gray-400 text-sm">Prepare for job interviews</p>
        </div>

      </button>

      <button
        onClick={() => onSelect('live')}
        className={`p-6 rounded-xl border-2 text-left transition duration-200 flex flex-col gap-3
          hover:-translate-y-1
          ${selectedMode === 'live'
            ? 'border-amber-400 bg-amber-500/20'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer '
          }`}
      >
        <Mic/>

        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Live</h3>
          <p className="text-gray-400 text-sm">Voice conversation with AI coach</p>
        </div>

      </button>
    </div>
  );
}
