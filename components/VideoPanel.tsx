'use client';

import { useEffect, useRef } from 'react';

interface VideoPanelProps {
  stream: MediaStream | null;
  onVideoElement?: (video: HTMLVideoElement) => void;
}

export default function VideoPanel({ stream, onVideoElement }: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      if (onVideoElement) {
        onVideoElement(videoRef.current);
      }
    }
  }, [stream, onVideoElement]);

  return (
    <div className="relative w-full aspect-video bg-gray-700 rounded-xl overflow-hidden shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="font-medium">Camera Disabled</p>
            <p className="text-sm text-gray-500 mt-1">Click "Enable Camera" to analyze body language</p>
          </div>
        </div>
      )}
      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
