// POST /api/report - Generate post-session report from OpenRouter
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptSegment } from '@/lib/types';

interface ReportRequest {
  mode: 'interview' | 'presentation';
  type?: string; // Sub-category like 'comedy', 'pitch', 'technical', etc.
  context?: string; // User-provided context about what they're preparing for
  duration_seconds: number;
  transcript: string;
  enrichedTranscript?: TranscriptSegment[]; // Full transcript with paralinguistic annotations
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

// Format enriched transcript for AI with annotations
function formatEnrichedTranscript(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) return '';
  
  let result = '';
  
  for (const segment of segments) {
    // Add pause indicator
    if (segment.pauseBefore && segment.pauseBefore > 500) {
      const pauseSec = (segment.pauseBefore / 1000).toFixed(1);
      result += `[PAUSE ${pauseSec}s] `;
    }
    
    // Add the text with filler markers
    let text = segment.text;
    if (segment.fillers && segment.fillers.length > 0) {
      // Wrap fillers in markers
      for (const filler of segment.fillers) {
        const regex = new RegExp(`\\b(${filler})\\b`, 'gi');
        text = text.replace(regex, '[FILLER: $1]');
      }
    }
    result += text;
    
    // Add tone annotations
    const toneMarkers: string[] = [];
    if (segment.tone) {
      if (segment.tone.volume === 'quiet') toneMarkers.push('quiet');
      if (segment.tone.volume === 'loud') toneMarkers.push('loud');
      if (segment.tone.energy === 'low') toneMarkers.push('low-energy');
      if (segment.tone.energy === 'high') toneMarkers.push('high-energy');
      if (segment.tone.pitchTrend === 'rising') toneMarkers.push('rising-pitch');
      if (segment.tone.pitchTrend === 'falling') toneMarkers.push('falling-pitch');
    }
    if (segment.speakingRate && segment.speakingRate !== 'normal') {
      toneMarkers.push(`${segment.speakingRate}-pace`);
    }
    if (segment.isHesitation) {
      toneMarkers.push('hesitant');
    }
    
    if (toneMarkers.length > 0) {
      result += ` [${toneMarkers.join(', ')}]`;
    }
    
    result += ' ';
  }
  
  return result.trim();
}

// Summarize paralinguistic patterns
function summarizeParalinguistics(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) return '';
  
  let totalPauses = 0;
  let longPauses = 0;
  let quietSegments = 0;
  let loudSegments = 0;
  let lowEnergySegments = 0;
  let highEnergySegments = 0;
  let risingPitch = 0;
  let fallingPitch = 0;
  let hesitations = 0;
  let fastSegments = 0;
  let slowSegments = 0;
  
  for (const segment of segments) {
    if (segment.pauseBefore && segment.pauseBefore > 500) totalPauses++;
    if (segment.pauseBefore && segment.pauseBefore > 2000) longPauses++;
    if (segment.tone?.volume === 'quiet') quietSegments++;
    if (segment.tone?.volume === 'loud') loudSegments++;
    if (segment.tone?.energy === 'low') lowEnergySegments++;
    if (segment.tone?.energy === 'high') highEnergySegments++;
    if (segment.tone?.pitchTrend === 'rising') risingPitch++;
    if (segment.tone?.pitchTrend === 'falling') fallingPitch++;
    if (segment.isHesitation) hesitations++;
    if (segment.speakingRate === 'fast') fastSegments++;
    if (segment.speakingRate === 'slow') slowSegments++;
  }
  
  const total = segments.length;
  const lines: string[] = [];
  
  if (totalPauses > 0) lines.push(`- Pauses detected: ${totalPauses} (${longPauses} were longer than 2 seconds)`);
  if (quietSegments > 0) lines.push(`- Spoke quietly: ${Math.round(quietSegments/total*100)}% of the time`);
  if (loudSegments > 0) lines.push(`- Spoke loudly: ${Math.round(loudSegments/total*100)}% of the time`);
  if (lowEnergySegments > total * 0.3) lines.push(`- Low vocal energy detected in ${Math.round(lowEnergySegments/total*100)}% of speech`);
  if (highEnergySegments > total * 0.3) lines.push(`- High vocal energy detected in ${Math.round(highEnergySegments/total*100)}% of speech`);
  if (risingPitch > total * 0.3) lines.push(`- Frequent rising pitch (${Math.round(risingPitch/total*100)}%) - may sound uncertain or questioning`);
  if (fallingPitch > total * 0.3) lines.push(`- Frequent falling pitch (${Math.round(fallingPitch/total*100)}%) - sounds declarative/confident`);
  if (hesitations > 0) lines.push(`- Hesitations detected: ${hesitations} times`);
  if (fastSegments > total * 0.3) lines.push(`- Speaking pace was fast ${Math.round(fastSegments/total*100)}% of the time`);
  if (slowSegments > total * 0.3) lines.push(`- Speaking pace was slow ${Math.round(slowSegments/total*100)}% of the time`);
  
  return lines.join('\n');
}

const BASE_SYSTEM_PROMPT = `You are an expert public speaking coach providing a post-session feedback report.

Analyze the practice session and provide constructive, actionable feedback.

The transcript may include paralinguistic annotations that indicate HOW something was said, not just what was said:
- [PAUSE Xs] = A pause of X seconds before speaking
- [FILLER: word] = A filler word like "um", "uh", "like"
- [quiet] = Spoke softly/low volume
- [loud] = Spoke with high volume/projection
- [low-energy] = Low vocal energy, may sound monotone or tired
- [high-energy] = High vocal energy, enthusiastic delivery
- [rising-pitch] = Voice pitch went up (can indicate uncertainty or questions)
- [falling-pitch] = Voice pitch went down (indicates confident statements)
- [fast-pace] = Speaking quickly in this segment
- [slow-pace] = Speaking slowly in this segment
- [hesitant] = Detected hesitation patterns

Use these annotations to give more specific feedback about delivery, not just content.

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

function getSystemPrompt(type?: string, context?: string): string {
  let prompt = BASE_SYSTEM_PROMPT;
  
  if (type && TYPE_PROMPTS[type]) {
    prompt = `${TYPE_PROMPTS[type]}

${BASE_SYSTEM_PROMPT}`;
  }
  
  // Add user-provided context if available
  if (context) {
    prompt = `${prompt}

IMPORTANT CONTEXT: The user was specifically preparing for: "${context}"
Tailor your feedback to be relevant to this specific context. Evaluate how well their delivery would work for this particular situation.`;
  }
  
  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { mode, type, context, duration_seconds, transcript, enrichedTranscript, metrics, final_score } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a default report if no API key
      return NextResponse.json(getDefaultReport(metrics, final_score));
    }

    const minutes = Math.round(duration_seconds / 60);
    
    // Format the enriched transcript if available
    const annotatedTranscript = enrichedTranscript 
      ? formatEnrichedTranscript(enrichedTranscript)
      : transcript;
    
    // Get paralinguistic summary
    const paralinguisticSummary = enrichedTranscript 
      ? summarizeParalinguistics(enrichedTranscript)
      : '';

    let userPrompt = `Mode: ${mode}${type ? ` (${type})` : ''}`;
    
    if (context) {
      userPrompt += `\nContext: The user was preparing for: ${context}`;
    }
    
    userPrompt += `
Duration: ${minutes} minute(s)
Final Score: ${final_score}/100

Session Metrics:
- Average pace: ${metrics.pace_wpm} WPM (ideal: 140-160)
- Filler word rate: ${metrics.filler_rate_per_min}/minute (ideal: ≤2)
- Eye contact: ${Math.round(metrics.eye_contact_pct * 100)}% (ideal: ≥70%)
- Longest pause: ${metrics.max_pause_ms}ms (ideal: ≤2000ms)
- Number of long pauses: ${metrics.pause_count}
- Motion/energy level: ${Math.round(metrics.motion_energy * 100)}% (ideal: 30-60%)`;

    if (paralinguisticSummary) {
      userPrompt += `

Voice & Delivery Analysis:
${paralinguisticSummary}`;
    }

    userPrompt += `

Annotated Transcript (with delivery markers):
"${annotatedTranscript.slice(0, 2500)}"

Provide a detailed feedback report that addresses both WHAT was said and HOW it was delivered.`;

    const systemPrompt = getSystemPrompt(type, context);

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
