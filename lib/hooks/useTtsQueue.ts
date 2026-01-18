'use client';

import { useState, useRef, useCallback } from 'react';
import { chunkForTTS } from '@/lib/ttsChunker';

interface UseTtsQueueReturn {
    play: (text: string) => Promise<boolean>;
    stop: () => void;
    isPlaying: boolean;
}

export function useTtsQueue(): UseTtsQueueReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortRef = useRef(false);

    const fetchTTS = async (text: string): Promise<Blob> => {
        const response = await fetch('/api/agent/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error('TTS fetch failed');
        }

        return response.blob();
    };

    const playAudio = (blob: Blob): Promise<void> => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };

            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };

            audio.play().catch(reject);
        });
    };

    const play = useCallback(async (text: string): Promise<boolean> => {
        abortRef.current = false;
        setIsPlaying(true);

        try {
            const chunks = chunkForTTS(text);

            for (const chunk of chunks) {
                if (abortRef.current) break;

                const audioBlob = await fetchTTS(chunk);

                if (abortRef.current) break;

                await playAudio(audioBlob);
            }
            setIsPlaying(false);
            return true;
        } catch (error) {
            console.error('TTS playback error:', error);
            setIsPlaying(false);
            return false;
        }
    }, []);

    const stop = useCallback(() => {
        abortRef.current = true;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    return { play, stop, isPlaying };
}
