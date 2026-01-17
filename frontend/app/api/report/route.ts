// POST /api/report - Generate post-session report from OpenRouter
import { NextRequest, NextResponse } from 'next/server';

interface ReportRequest {
  mode: 'interview' | 'presentation';
  type?: string; // Sub-category like 'comedy', 'pitch', 'technical', etc.
  duration_seconds: number;
  transcript: string;
  metrics: {
    pace_wpm: number;
    filler_rate_per_min: number;
    eye_contact_pct: number;
    max_pause_ms: number;
    motion_energy: number;
    pause_count: number;
  };
  final_score: number;
}

const BASE_SYSTEM_PROMPT = `You are an expert public speaking coach providing a post-session feedback report.

Analyze the practice session and provide constructive, actionable feedback.

Respond with JSON only:
{
  "overall_summary": "2-3 sentence summary of performance",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "next_goal": "One specific, measurable goal for the next session"
}`;

// Sub-category specific prompt additions
const TYPE_PROMPTS: Record<string, string> = {
  // Presentation sub-categories
  comedy: `You are providing feedback as an experienced stand-up comedy coach.
Focus on comedic timing, delivery rhythm, and stage presence.
For comedians, strategic pauses are good for laugh timing, expressive energy is valued, and confident delivery is key.
Frame feedback in terms of comedic performance - "punchline delivery", "setup pacing", "audience connection".
Filler words can kill comedic timing. Suggest how to use pauses effectively for laughs.`,

  pitch: `You are providing feedback as an expert sales and pitch coach.
Focus on persuasion techniques, confidence projection, and clarity of value proposition.
Emphasize how delivery affects credibility and trust-building with investors or clients.
Frame feedback in terms of sales effectiveness - "conviction", "closing strength", "audience engagement".
A steady, confident pace builds trust, while strong eye contact establishes credibility.`,

  business: `You are providing feedback as a professional business communication coach.
Focus on executive presence, clarity, and authority.
Emphasize professional delivery, clear articulation, and confident body language.
Frame feedback in terms of business effectiveness - "stakeholder engagement", "professional presence", "message clarity".`,

  school: `You are providing feedback as a supportive educational coach for students.
Be encouraging and constructive - this may be a young learner building confidence.
Focus on clear communication, maintaining good pace, and building presentation confidence.
Frame feedback in supportive terms - "great effort", "room to grow", "keep practicing".`,

  // Interview sub-categories
  technical: `You are providing feedback as a technical interview coach.
Focus on clarity of technical explanations, structured communication, and confident delivery.
In coding interviews, thinking out loud clearly is essential. Brief pauses to think are acceptable.
Frame feedback in terms of interview success - "technical clarity", "problem-solving communication", "confidence under pressure".`,

  behavioral: `You are providing feedback as a behavioral interview coach.
Focus on storytelling ability, authenticity, and demonstrating cultural fit.
Emphasize the STAR method effectiveness, genuine responses, and connecting with interviewers.
Frame feedback in terms of interview success - "story structure", "authenticity", "rapport building".`,

  'case': `You are providing feedback as a technical interview coach.
Focus on logical flow of explanations, confident problem-solving delivery, and structured thinking.
Emphasize how well they articulated their thought process.
Frame feedback in terms of interview success - "logical clarity", "structured responses", "technical communication".`,
};

function getSystemPrompt(type?: string): string {
  if (type && TYPE_PROMPTS[type]) {
    return `${TYPE_PROMPTS[type]}

${BASE_SYSTEM_PROMPT}`;
  }
  return BASE_SYSTEM_PROMPT;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { mode, type, duration_seconds, transcript, metrics, final_score } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a default report if no API key
      return NextResponse.json(getDefaultReport(metrics, final_score));
    }

    const minutes = Math.round(duration_seconds / 60);
    const userPrompt = `Mode: ${mode}${type ? ` (${type})` : ''}
Duration: ${minutes} minute(s)
Final Score: ${final_score}/100

Session Metrics:
- Average pace: ${metrics.pace_wpm} WPM (ideal: 140-160)
- Filler word rate: ${metrics.filler_rate_per_min}/minute (ideal: ≤2)
- Eye contact: ${Math.round(metrics.eye_contact_pct * 100)}% (ideal: ≥70%)
- Longest pause: ${metrics.max_pause_ms}ms (ideal: ≤2000ms)
- Number of long pauses: ${metrics.pause_count}
- Motion/energy level: ${Math.round(metrics.motion_energy * 100)}% (ideal: 30-60%)

Transcript:
"${transcript.slice(0, 2000)}"

Provide a detailed feedback report.`;

    const systemPrompt = getSystemPrompt(type);

    // Log the prompts being sent to the AI
    console.log('=== REPORT API - Prompt Details ===');
    console.log('Mode:', mode);
    console.log('Type (sub-category):', type || 'none');
    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);
    console.log('===================================');

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', await response.text());
      return NextResponse.json(getDefaultReport(metrics, final_score));
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      // Return default if parsing fails
      return NextResponse.json(getDefaultReport(metrics, final_score));
    }
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function getDefaultReport(
  metrics: ReportRequest['metrics'],
  score: number
): {
  overall_summary: string;
  strengths: string[];
  improvements: string[];
  next_goal: string;
} {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Analyze metrics for strengths
  if (metrics.pace_wpm >= 140 && metrics.pace_wpm <= 160) {
    strengths.push('Good speaking pace');
  } else if (metrics.pace_wpm > 160) {
    improvements.push('Slow down your speaking pace to 140-160 WPM');
  } else {
    improvements.push('Increase your speaking pace slightly');
  }

  if (metrics.filler_rate_per_min <= 2) {
    strengths.push('Minimal use of filler words');
  } else {
    improvements.push(`Reduce filler words - try pausing instead of saying "um" or "uh"`);
  }

  if (metrics.eye_contact_pct >= 0.7) {
    strengths.push('Strong eye contact with the camera');
  } else {
    improvements.push('Increase eye contact by looking directly at the camera');
  }

  if (metrics.motion_energy >= 0.3 && metrics.motion_energy <= 0.6) {
    strengths.push('Good use of body language and movement');
  } else if (metrics.motion_energy < 0.3) {
    improvements.push('Use more natural hand gestures to emphasize key points');
  } else {
    improvements.push('Reduce excessive movement to appear more composed');
  }

  if (metrics.max_pause_ms <= 2000) {
    if (strengths.length < 2) strengths.push('Good pacing without long pauses');
  } else {
    improvements.push('Keep pauses under 2 seconds to maintain engagement');
  }

  // Ensure we have at least 2 strengths and 3 improvements
  while (strengths.length < 2) {
    strengths.push('Good effort and practice commitment');
  }
  while (improvements.length < 3) {
    improvements.push('Continue practicing regularly to build confidence');
  }

  const scoreDescription = score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'developing';

  return {
    overall_summary: `You delivered a ${scoreDescription} practice session with a score of ${score}/100. ${strengths[0]} was a notable strength. Focus on ${improvements[0].toLowerCase()} in your next session.`,
    strengths: strengths.slice(0, 2),
    improvements: improvements.slice(0, 3),
    next_goal: `Next session: Aim for ${metrics.filler_rate_per_min > 2 ? 'fewer than 2 filler words per minute' : metrics.eye_contact_pct < 0.7 ? 'at least 70% eye contact' : 'maintaining a pace of 140-160 WPM'}.`,
  };
}
