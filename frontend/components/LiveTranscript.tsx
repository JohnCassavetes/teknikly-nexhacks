'use client';

import { useRef, useEffect } from 'react';
import { TranscriptSegment, ToneInfo } from '@/lib/types';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
  maxHeight?: string;
  showEffects?: boolean; // Toggle to show/hide paralinguistic annotations
}

// Format pause duration for display
function formatPause(ms: number): string {
  if (ms < 500) return '';
  if (ms < 1000) return `(${Math.round(ms / 100) / 10}s)`;
  const seconds = Math.round(ms / 100) / 10;
  return `(${seconds}s)`;
}

// Get CSS class for speaking rate
function getRateClass(rate?: 'slow' | 'normal' | 'fast'): string {
  switch (rate) {
    case 'slow':
      return 'tracking-wider';
    case 'fast':
      return 'tracking-tighter italic';
    default:
      return '';
  }
}

// Get tone indicator emoji and class
function getToneIndicator(tone?: ToneInfo): { emoji: string; className: string; tooltip: string } | null {
  if (!tone) return null;
  
  const indicators: string[] = [];
  const classes: string[] = [];
  const tooltips: string[] = [];
  
  // Volume indicators
  if (tone.volume === 'quiet') {
    indicators.push('🔈');
    classes.push('opacity-60');
    tooltips.push('Quiet');
  } else if (tone.volume === 'loud') {
    indicators.push('🔊');
    classes.push('font-semibold');
    tooltips.push('Loud');
  }
  
  // Energy indicators
  if (tone.energy === 'high') {
    indicators.push('⚡');
    tooltips.push('High energy');
  } else if (tone.energy === 'low') {
    indicators.push('😐');
    tooltips.push('Low energy');
  }
  
  // Pitch trend indicators
  if (tone.pitchTrend === 'rising') {
    indicators.push('↗️');
    tooltips.push('Rising pitch (question?)');
  } else if (tone.pitchTrend === 'falling') {
    indicators.push('↘️');
    tooltips.push('Falling pitch (statement)');
  }
  
  if (indicators.length === 0) return null;
  
  return {
    emoji: indicators.join(''),
    className: classes.join(' '),
    tooltip: tooltips.join(' | '),
  };
}

// Highlight fillers in text
function highlightFillers(text: string, fillers?: string[]): React.ReactNode {
  if (!fillers || fillers.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Create a regex to find all fillers
  const fillerPattern = new RegExp(`\\b(${fillers.join('|')})\\b`, 'gi');
  const matches = [...text.matchAll(fillerPattern)];

  if (matches.length === 0) return text;

  let lastIndex = 0;
  for (const match of matches) {
    const index = match.index!;
    // Add text before the filler
    if (index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, index)}</span>);
    }
    // Add the highlighted filler
    parts.push(
      <span
        key={key++}
        className="bg-yellow-500/30 text-yellow-300 rounded px-0.5"
        title="Filler word"
      >
        {match[0]}
      </span>
    );
    lastIndex = index + match[0].length;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export default function LiveTranscript({
  segments,
  maxHeight = '200px',
  showEffects = true,
}: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  // Render a single segment with effects
  const renderSegment = (segment: TranscriptSegment, index: number) => {
    if (!showEffects) {
      return <span key={index}>{segment.text} </span>;
    }

    const elements: React.ReactNode[] = [];

    // Show pause indicator before segment (show pauses > 500ms)
    if (segment.pauseBefore && segment.pauseBefore > 500) {
      elements.push(
        <span
          key={`pause-${index}`}
          className="text-blue-400 text-xs mx-1"
          title={`${Math.round(segment.pauseBefore / 1000)}s pause`}
        >
          ⏸️ {formatPause(segment.pauseBefore)}
        </span>
      );
    }

    // Get tone indicator
    const toneIndicator = getToneIndicator(segment.tone);

    // Build the text with effects
    const rateClass = getRateClass(segment.speakingRate);
    const hesitationClass = segment.isHesitation ? 'text-orange-300' : '';
    const confidenceOpacity = segment.confidence !== undefined && segment.confidence < 0.7 
      ? 'opacity-70' 
      : '';
    const toneClass = toneIndicator?.className || '';

    const textContent = highlightFillers(segment.text, segment.fillers);

    // Build tooltip with all info
    const tooltipParts: string[] = [];
    if (segment.confidence !== undefined) {
      tooltipParts.push(`Confidence: ${Math.round(segment.confidence * 100)}%`);
    }
    if (segment.speakingRate && segment.speakingRate !== 'normal') {
      tooltipParts.push(`Rate: ${segment.speakingRate}`);
    }
    if (toneIndicator?.tooltip) {
      tooltipParts.push(toneIndicator.tooltip);
    }

    elements.push(
      <span
        key={`text-${index}`}
        className={`${rateClass} ${hesitationClass} ${confidenceOpacity} ${toneClass}`.trim()}
        title={tooltipParts.length > 0 ? tooltipParts.join(' | ') : undefined}
      >
        {textContent}
      </span>
    );

    // Show tone indicators after text
    if (toneIndicator) {
      elements.push(
        <span
          key={`tone-${index}`}
          className="text-xs ml-0.5 opacity-70"
          title={toneIndicator.tooltip}
        >
          {toneIndicator.emoji}
        </span>
      );
    }

    // Add spacing
    elements.push(<span key={`space-${index}`}> </span>);

    return elements;
  };

  // Get segments for display
  const finalSegments = segments.filter((s) => s.isFinal);
  const pendingSegments = segments.filter((s) => !s.isFinal);
  const pendingText = pendingSegments.length > 0 
    ? pendingSegments[pendingSegments.length - 1].text 
    : '';

  return (
    <div
      ref={containerRef}
      className="bg-gray-800/50 rounded-lg p-4 overflow-y-auto border border-gray-700"
      style={{ maxHeight }}
    >
      <div className="text-sm text-gray-400 mb-2 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Live Transcript
        </div>
        {showEffects && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1">
              <span className="bg-yellow-500/30 text-yellow-300 px-1 rounded">um</span>
              <span className="text-gray-500">fillers</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-400">⏸️</span>
              <span className="text-gray-500">pauses</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🔊🔈</span>
              <span className="text-gray-500">volume</span>
            </span>
            <span className="flex items-center gap-1">
              <span>↗️↘️</span>
              <span className="text-gray-500">pitch</span>
            </span>
          </div>
        )}
      </div>
      <div className="text-white leading-relaxed">
        {finalSegments.length > 0 || pendingText ? (
          <>
            {finalSegments.map((segment, index) => renderSegment(segment, index))}
            {pendingText && (
              <span className="text-gray-400 italic">{pendingText}</span>
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
