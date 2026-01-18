'use client';

import { useState } from 'react';
import { CoachTip as CoachTipType } from '@/lib/types';

interface CoachTipProps {
  tip: CoachTipType | null;
}

export default function CoachTip({ tip }: CoachTipProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!tip) {
    return null;
  }

  const speakTip = async () => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tip.tip }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Failed to speak tip:', error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
      <div className="flex items-start gap-3">
        {/* <div className="text-2xl">🎯</div> */}
        <div className="flex-1">
          <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">
            AI Coach Tip
          </div>
          <p className="text-white font-medium">{tip.tip}</p>
        </div>
        <button
          onClick={speakTip}
          disabled={isSpeaking}
          className="flex-shrink-0 p-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isSpeaking ? 'Speaking...' : 'Speak tip'}
        >
          {/* {isSpeaking ? (
            <span className="text-xl animate-pulse">🔊</span>
          ) : (
            <span className="text-xl">🔈</span>
          )} */}

          {isSpeaking ? (
            <span className="text-xl animate-pulse">Speaking</span>
          ) : (
            <span className="text-xl">Not speaking</span>
          )}
        </button>
      </div>
    </div>
  );
}
