/**
 * TTS Chunking Utility
 * Handles 200 char limit for ElevenLabs TTS
 */

const MAX_CHUNK_SIZE = 180;

export function chunkForTTS(text: string): string[] {
    if (text.length <= MAX_CHUNK_SIZE) {
        return [text];
    }

    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        if (currentChunk.length + trimmed.length + 1 <= MAX_CHUNK_SIZE) {
            currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            if (trimmed.length > MAX_CHUNK_SIZE) {
                const subChunks = splitLongSentence(trimmed);
                chunks.push(...subChunks);
                currentChunk = '';
            } else {
                currentChunk = trimmed;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function splitLongSentence(sentence: string): string[] {
    const chunks: string[] = [];
    const commaSegments = sentence.split(/,\s*/);

    let currentChunk = '';

    for (const segment of commaSegments) {
        if (currentChunk.length + segment.length + 2 <= MAX_CHUNK_SIZE) {
            currentChunk = currentChunk ? `${currentChunk}, ${segment}` : segment;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            if (segment.length > MAX_CHUNK_SIZE) {
                const words = segment.split(' ');
                let wordChunk = '';

                for (const word of words) {
                    if (wordChunk.length + word.length + 1 <= MAX_CHUNK_SIZE) {
                        wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
                    } else {
                        if (wordChunk) chunks.push(wordChunk);
                        wordChunk = word;
                    }
                }

                if (wordChunk) chunks.push(wordChunk);
                currentChunk = '';
            } else {
                currentChunk = segment;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
