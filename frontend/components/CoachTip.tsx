'use client';

import { CoachTip as CoachTipType } from '@/lib/types';

interface CoachTipProps {
  tip: CoachTipType | null;
}

export default function CoachTip({ tip }: CoachTipProps) {
  if (!tip) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎯</div>
        <div>
          <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">
            AI Coach Tip
          </div>
          <p className="text-white font-medium">{tip.tip}</p>
        </div>
      </div>
    </div>
  );
}
