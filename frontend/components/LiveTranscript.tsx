'use client';

import { useRef, useEffect } from 'react';
import { TranscriptSegment } from '@/lib/types';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
  maxHeight?: string;
}

export default function LiveTranscript({
  segments,
  maxHeight = '200px',
}: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  // Get full transcript text
  const getText = () => {
    const finalSegments = segments.filter((s) => s.isFinal);
    const pendingSegments = segments.filter((s) => !s.isFinal);

    return {
      final: finalSegments.map((s) => s.text).join(' '),
      pending: pendingSegments.length > 0 ? pendingSegments[pendingSegments.length - 1].text : '',
    };
  };

  const { final, pending } = getText();

  return (
    <div
      ref={containerRef}
      className="bg-gray-800/50 rounded-lg p-4 overflow-y-auto border border-gray-700"
      style={{ maxHeight }}
    >
      <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Live Transcript
      </div>
      <div className="text-white leading-relaxed">
        {final || pending ? (
          <>
            <span>{final}</span>
            {pending && (
              <span className="text-gray-400 italic"> {pending}</span>
            )}
          </>
        ) : (
          <span className="text-gray-500 italic">
            Start speaking to see your transcript...
          </span>
        )}
      </div>
    </div>
  );
}
