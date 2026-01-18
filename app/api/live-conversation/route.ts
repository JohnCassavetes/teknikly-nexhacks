import { NextResponse } from 'next/server';
import { ConversationTurn } from '@/lib/types';

interface LiveConversationRequest {
    prompt: string;
    conversationHistory: ConversationTurn[];
    userResponse: string;
    responseType: 'initial' | 'response' | 'encouragement';
}

export async function POST(req: Request) {
    try {
        const { prompt, conversationHistory, userResponse, responseType } =
            await req.json() as LiveConversationRequest;

        // Build conversation messages for the LLM
        const messages = [
            {
                role: 'system',
                content: `You are a supportive conversational coach helping the user practice: "${prompt}"

Rules:
1. Ask one focused question at a time
2. Keep responses SHORT (under 150 characters ideally) for natural voice conversation
3. After user answers: give 1 brief positive point + ask follow-up question
4. Be warm, encouraging, and conversational
5. Do NOT use markdown, lists, or special formatting
6. Speak naturally as if in a real conversation
7. If responseType is "encouragement", just give brief encouragement to continue

Current goal: ${responseType === 'initial'
                        ? 'Start the practice session with a welcoming question.'
                        : responseType === 'encouragement'
                            ? 'Give brief encouragement - user is pausing.'
                            : 'Respond to what the user said and ask a follow-up.'
                    }`
            }
        ];

        // Add conversation history
        for (const turn of conversationHistory) {
            messages.push({
                role: turn.role === 'ai' ? 'assistant' : 'user',
                content: turn.content
            });
        }

        // Add latest user response if this is a response
        if (responseType === 'response' || responseType === 'encouragement') {
            messages.push({
                role: 'user',
                content: userResponse || '(user is thinking...)'
            });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://teknikly.com',
                'X-Title': 'EasySpeech Live',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter API Error:', error);
            return NextResponse.json({ error: 'Failed to get AI response' }, { status: response.status });
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;

        return NextResponse.json({
            message: aiMessage,
            type: responseType === 'encouragement' ? 'encouragement' :
                responseType === 'initial' ? 'question' : 'feedback_and_question'
        });

    } catch (error) {
        console.error('Error in live-conversation API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
