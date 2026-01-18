// POST /api/coach - Get live coaching tip from OpenRouter
import { NextRequest, NextResponse } from 'next/server';
import { InterviewQuestion } from '@/lib/types';

interface InterviewSetupContext {
  source: 'resume' | 'job_description' | 'surprise_me';
  resume?: string;
  jobDescription?: string;
  selectedQuestion: InterviewQuestion;
}

interface CoachRequest {
  mode: 'interview' | 'presentation';
  type?: string; // Sub-category like 'comedy', 'pitch', 'technical', etc.
  context?: string; // User-provided context about what they're preparing for
  interviewSetup?: InterviewSetupContext; // Interview-specific context
  recent_transcript: string;
  metrics: {
    pace_wpm: number;
    filler_rate_per_min: number;
    eye_contact_pct: number;
    max_pause_ms: number;
    motion_energy: number;
  };
}

const BASE_SYSTEM_PROMPT = `You are a real-time public speaking coach. Give ONE short, actionable coaching tip based on the metrics and transcript provided.

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

// Sub-category specific prompt additions
const TYPE_PROMPTS: Record<string, string> = {
  // Presentation sub-categories
  comedy: `You are coaching a stand-up comedian. Focus on timing, delivery, and comedic pacing. 
Comedians benefit from strategic pauses for laughs, expressive energy, and confident delivery. 
Filler words can kill comedic timing. Eye contact helps connect with the audience.`,
  
  pitch: `You are coaching someone giving a sales or investor pitch. Focus on persuasion, confidence, and clarity.
Emphasize conviction, clear value propositions, and maintaining engagement. 
A steady pace builds trust, while eye contact establishes credibility.`,
  
  business: `You are coaching a business presenter. Focus on professionalism, clarity, and authority.
Emphasize clear articulation, measured pace, and confident body language.
Minimize filler words to maintain credibility.`,
  
  school: `You are coaching a student on their school presentation. Be encouraging and supportive.
Focus on clear communication, good pace, and building confidence.
Help them feel more comfortable speaking in front of others.`,
  
  // Interview sub-categories
  technical: `You are coaching someone for a coding/technical interview. Focus on clear explanation of technical concepts.
Emphasize structured responses, thinking out loud clearly, and confident delivery.
Pauses to think are acceptable but should be brief.`,
  
  behavioral: `You are coaching someone for a behavioral interview. Focus on storytelling and authenticity.
Emphasize the STAR method (Situation, Task, Action, Result), genuine responses, and good eye contact.
Help them convey confidence and cultural fit.`,
  
  'case': `You are coaching someone for a technical verbal interview. Focus on clear problem-solving explanation.
Emphasize logical flow, confident delivery, and structured thinking.
Help them articulate their thought process clearly.`,
};

function getSystemPrompt(type?: string, context?: string, interviewSetup?: InterviewSetupContext): string {
  let prompt = BASE_SYSTEM_PROMPT;
  
  if (type && TYPE_PROMPTS[type]) {
    prompt = `${TYPE_PROMPTS[type]}

${BASE_SYSTEM_PROMPT}`;
  }
  
  // Add interview-specific context
  if (interviewSetup) {
    prompt += `\n\nINTERVIEW CONTEXT:
Question being answered: "${interviewSetup.selectedQuestion.question}"`;
    
    if (interviewSetup.resume) {
      prompt += `\n\nThe candidate has a resume with the following highlights. If they're missing key points from their background, encourage them to mention relevant experience:
${interviewSetup.resume.substring(0, 1000)}${interviewSetup.resume.length > 1000 ? '...' : ''}`;
    }
    
    if (interviewSetup.jobDescription) {
      prompt += `\n\nThey are preparing for a job with this description (tailor tips to what the role requires):
${interviewSetup.jobDescription.substring(0, 500)}${interviewSetup.jobDescription.length > 500 ? '...' : ''}`;
    }
  }
  
  // Add user-provided context if available
  if (context && !interviewSetup) {
    prompt = `${prompt}

IMPORTANT CONTEXT: The user is specifically preparing for: "${context}"
Tailor your coaching tips to be relevant to this specific context.`;
  }
  
  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { mode, type, context, interviewSetup, recent_transcript, metrics } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a default tip if no API key
      return NextResponse.json({
        tip: getDefaultTip(metrics, type),
        priority: getTopPriority(metrics),
      });
    }

    let userPrompt = `Mode: ${mode}${type ? ` (${type})` : ''}`;
    
    if (context) {
      userPrompt += `\nContext: ${context}`;
    }

    if (interviewSetup) {
      userPrompt += `\nQuestion: ${interviewSetup.selectedQuestion.question}`;
    }
    
    userPrompt += `
Recent transcript: "${recent_transcript.slice(-500)}"

Metrics:
- Pace: ${metrics.pace_wpm} WPM (ideal: 140-160)
- Filler rate: ${metrics.filler_rate_per_min}/min (ideal: ≤2)
- Eye contact: ${Math.round(metrics.eye_contact_pct * 100)}% (ideal: ≥70%)
- Max pause: ${metrics.max_pause_ms}ms (ideal: ≤2000ms)
- Motion energy: ${Math.round(metrics.motion_energy * 100)}% (ideal: 30-60%)

Give one coaching tip.`;

    const systemPrompt = getSystemPrompt(type, context, interviewSetup);

    // Log the prompts being sent to the AI
    console.log('=== COACH API (Live Tips) - Prompt Details ===');
    console.log('Mode:', mode);
    console.log('Type (sub-category):', type || 'none');
    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);
    console.log('==============================================');

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
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', await response.text());
      return NextResponse.json({
        tip: getDefaultTip(metrics, type),
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
        tip: content.slice(0, 100) || getDefaultTip(metrics, type),
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

function getDefaultTip(metrics: CoachRequest['metrics'], type?: string): string {
  const priority = getTopPriority(metrics);
  
  // Type-specific tips
  const typeTips: Record<string, Record<string, string>> = {
    comedy: {
      pace: 'Slow down for better comedic timing.',
      fillers: 'Cut the "ums" - they kill your punchlines!',
      eye_contact: 'Connect with your audience - look at them!',
      pauses: 'Use pauses strategically for laughs.',
      energy: 'Bring more energy - own the stage!',
    },
    pitch: {
      pace: 'Slow down to build trust and credibility.',
      fillers: 'Pause confidently instead of using fillers.',
      eye_contact: 'Maintain eye contact to establish credibility.',
      pauses: 'Keep momentum - don\'t lose your investor\'s attention.',
      energy: 'Project confidence with purposeful gestures.',
    },
    business: {
      pace: 'Maintain a measured, professional pace.',
      fillers: 'Eliminate fillers to sound more authoritative.',
      eye_contact: 'Strong eye contact projects executive presence.',
      pauses: 'Keep engagement high - minimize dead air.',
      energy: 'Use confident, professional body language.',
    },
    school: {
      pace: 'Take your time - you\'re doing great!',
      fillers: 'Try pausing instead of saying "um".',
      eye_contact: 'Look up at your audience more - you got this!',
      pauses: 'Keep going - you\'re doing well!',
      energy: 'Use your hands to help explain your points.',
    },
    technical: {
      pace: 'Slow down when explaining complex concepts.',
      fillers: 'Pause to think - it\'s better than fillers.',
      eye_contact: 'Look at the interviewer while explaining.',
      pauses: 'Brief pauses are OK - keep your flow.',
      energy: 'Stay engaged - show enthusiasm for the problem.',
    },
    behavioral: {
      pace: 'Take time to tell your story clearly.',
      fillers: 'Pause and collect your thoughts.',
      eye_contact: 'Connect with the interviewer - eye contact matters.',
      pauses: 'Structure your answer - use the STAR method.',
      energy: 'Show genuine enthusiasm for your experiences.',
    },
    'case': {
      pace: 'Explain your logic clearly and steadily.',
      fillers: 'Think silently, then speak confidently.',
      eye_contact: 'Engage the interviewer as you explain.',
      pauses: 'Walk through your reasoning step by step.',
      energy: 'Show confidence in your problem-solving.',
    },
  };

  // Use type-specific tip if available
  if (type && typeTips[type] && typeTips[type][priority]) {
    return typeTips[type][priority];
  }

  // Generic fallback tips
  const defaultTips: Record<string, string> = {
    pace: 'Slow down and breathe between sentences.',
    fillers: 'Pause instead of using filler words.',
    eye_contact: 'Look directly at the camera.',
    pauses: 'Keep your energy up and minimize long pauses.',
    energy: 'Use natural hand gestures to emphasize points.',
  };
  return defaultTips[priority] || 'Keep up the great work!';
}
