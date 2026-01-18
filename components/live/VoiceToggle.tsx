'use client';

interface VoiceToggleProps {
    enabled: boolean;
    onToggle: () => void;
    isSpeaking?: boolean;
}

export default function VoiceToggle({ enabled, onToggle, isSpeaking }: VoiceToggleProps) {
    return (
        <button
            onClick={onToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${enabled
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                : 'bg-gray-800 border border-gray-700 text-gray-400'
                }`}
        >
            <span className={`text-xl ${isSpeaking ? 'animate-pulse' : ''}`}>
                {enabled ? 'On' : 'Off'}
            </span>
            <span className="text-sm font-medium">
                Voice {enabled ? 'On' : 'Off'}
            </span>
        </button>
    );
}
