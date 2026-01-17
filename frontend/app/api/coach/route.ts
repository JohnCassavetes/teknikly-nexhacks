// POST /api/coach - Get live coaching tip from OpenRouter
import { NextRequest, NextResponse } from 'next/server';

interface CoachRequest {
  mode: 'interview' | 'presentation';
  recent_transcript: string;
  metrics: {
    pace_wpm: number;
    filler_rate_per_min: number;
    eye_contact_pct: number;
    max_pause_ms: number;
    motion_energy: number;
  };
}

const SYSTEM_PROMPT = `You are a real-time public speaking coach. Give ONE short, actionable coaching tip based on the metrics and transcript provided.

Guidelines:
- Keep tips under 15 words
- Be encouraging but direct
- Focus on the most impactful improvement
- Consider the mode (interview vs presentation)

Respond with JSON only:
{
  "tip": "Your coaching tip here",
  "priority": "pace" | "fillers" | "eye_contact" | "pauses" | "energy"
}`;

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { mode, recent_transcript, metrics } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a default tip if no API key
      return NextResponse.json({
        tip: getDefaultTip(metrics),
        priority: getTopPriority(metrics),
      });
    }

    const userPrompt = `Mode: ${mode}
Recent transcript: "${recent_transcript.slice(-500)}"

Metrics:
- Pace: ${metrics.pace_wpm} WPM (ideal: 140-160)
- Filler rate: ${metrics.filler_rate_per_min}/min (ideal: ≤2)
- Eye contact: ${Math.round(metrics.eye_contact_pct * 100)}% (ideal: ≥70%)
- Max pause: ${metrics.max_pause_ms}ms (ideal: ≤2000ms)
- Motion energy: ${Math.round(metrics.motion_energy * 100)}% (ideal: 30-60%)

Give one coaching tip.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://talkcoach.vercel.app',
        'X-Title': 'TalkCoach',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', await response.text());
      return NextResponse.json({
        tip: getDefaultTip(metrics),
        priority: getTopPriority(metrics),
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      // Try to extract tip from non-JSON response
      return NextResponse.json({
        tip: content.slice(0, 100) || getDefaultTip(metrics),
        priority: getTopPriority(metrics),
      });
    }
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to get coaching tip' },
      { status: 500 }
    );
  }
}

function getTopPriority(metrics: CoachRequest['metrics']): string {
  if (metrics.pace_wpm > 170) return 'pace';
  if (metrics.filler_rate_per_min > 3) return 'fillers';
  if (metrics.eye_contact_pct < 0.6) return 'eye_contact';
  if (metrics.max_pause_ms > 2500) return 'pauses';
  if (metrics.motion_energy < 0.2 || metrics.motion_energy > 0.7) return 'energy';
  return 'pace';
}

function getDefaultTip(metrics: CoachRequest['metrics']): string {
  const priority = getTopPriority(metrics);
  const tips: Record<string, string> = {
    pace: 'Slow down and breathe between sentences.',
    fillers: 'Pause instead of using filler words.',
    eye_contact: 'Look directly at the camera.',
    pauses: 'Keep your energy up and minimize long pauses.',
    energy: 'Use natural hand gestures to emphasize points.',
  };
  return tips[priority] || 'Keep up the great work!';
}
