import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages) {
            return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://teknikly.com',
                'X-Title': 'EasySpeech',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert communication coach. 
            User will start by pitching an idea or scenario. 
            Your goal is to roleplay with them or interview them based on that scenario.
            
            Rules:
            1. Keep responses concise (1-3 sentences max) to keep the conversation flowing naturally in voice.
            2. Be encouraging but probing.
            3. If it's a pitch, ask clarifying questions about their market, problem, or solution.
            4. If it's an interview practice, ask behavioral or technical questions relevant to their topic.
            5. Do NOT use markdown formatting like bolding or lists, as this will be read out loud.
            6. Act as if you are speaking to them directly.`
                    },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter API Error:', error);
            return NextResponse.json({ error: 'Failed to fetch from OpenRouter' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
