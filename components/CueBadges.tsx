'use client';

import { CueType } from '@/lib/scoring';

interface CueBadgesProps {
  activeCues: CueType[];
}

const CUE_CONFIG: Record<
  Exclude<CueType, null>,
  { label: string; icon: string; color: string }
> = {
  slow_down: {
    label: 'Slow Down',
    icon: '⏱️',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  },
  reduce_fillers: {
    label: 'Reduce Fillers',
    icon: '💬',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  },
  look_at_camera: {
    label: 'Look at Camera',
    icon: '👁️',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  },
  project_confidence: {
    label: 'Project Confidence',
    icon: '💪',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  },
};

export default function CueBadges({ activeCues }: CueBadgesProps) {
  const validCues = activeCues.filter((cue): cue is Exclude<CueType, null> => cue !== null);

  if (validCues.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
        <span className="text-lg">✨</span>
        <span className="text-green-400 text-sm font-medium">Looking good!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {validCues.map((cue) => {
        const config = CUE_CONFIG[cue];
        return (
          <div
            key={cue}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color} animate-pulse`}
          >
            <span className="text-lg">{config.icon}</span>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
