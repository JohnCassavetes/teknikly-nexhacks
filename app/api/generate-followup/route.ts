// POST /api/generate-followup - Generate follow-up questions based on previous response
import { NextRequest, NextResponse } from 'next/server';
import { Metrics } from '@/lib/types';

interface GenerateFollowupRequest {
  mode: 'interview' | 'presentation';
  type?: string; // Sub-category like 'comedy', 'pitch', 'technical', etc.
  context?: string; // User-provided context about what they're preparing for
  previousQuestion: string;
  previousResponse: string; // Full transcript of previous response
  previousMetrics: {
    pace_wpm: number;
    filler_rate_per_min: number;
    eye_contact_pct: number;
    max_pause_ms: number;
    motion_energy: number;
  };
  previousScore: number;
  // Interview-specific data
  resume?: string;
  jobDescription?: string;
  excludedQuestions?: string[];
}

interface GenerateFollowupResponse {
  question: string;
  context?: string;
}

function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const BEHAVIORAL_SYSTEM_PROMPT = `You are an expert behavioral interview coach. Based on the candidate's previous response and performance metrics, generate a thoughtful follow-up question that:

- Digs deeper into the situation, skills, or challenges they mentioned
- Builds naturally on what they already discussed
- Helps assess complementary skills or explore different angles of their experience
- Maintains STAR method format (asking about situation, task, action, results)
- Is challenging but constructive

Respond with JSON only:
{
  "question": "Follow-up question here",
  "context": "Brief explanation of why this follow-up matters"
}`;

const TECHNICAL_SYSTEM_PROMPT = `You are an expert technical interview coach. Based on the candidate's previous response and performance metrics, generate a thoughtful follow-up question that:

- Digs deeper into the technical concepts they explained
- Explores edge cases, trade-offs, or alternative approaches
- Assesses their depth of understanding on a related topic
- Maintains technical rigor while being conversational
- Naturally extends the discussion

Respond with JSON only:
{
  "question": "Follow-up question here",
  "context": "Brief explanation of why this follow-up matters"
}`;

const PRESENTATION_SYSTEM_PROMPT = `You are a presentation coach. Based on the speaker's previous response and performance metrics, generate a thoughtful follow-up question or prompt that:

- Explores related aspects of their topic
- Challenges them to elaborate or provide examples
- Tests their depth of knowledge or conviction
- Helps them practice handling audience follow-ups naturally
- Is appropriate for their presentation type and context

Respond with JSON only:
{
  "question": "Follow-up question here",
  "context": "Brief explanation of why this follow-up matters"
}`;

const PITCH_SYSTEM_PROMPT = `You are a sales/pitch coach. Based on the pitcher's previous response and performance metrics, generate a sophisticated follow-up question or objection that:

- A potential investor, customer, or stakeholder might ask
- Tests their understanding of their business or product
- Challenges them to think on their feet
- Builds naturally on their previous pitch
- Helps them practice handling real-world objections

Respond with JSON only:
{
  "question": "Follow-up question/objection here",
  "context": "Brief explanation of why this follow-up matters"
}`;

function getSystemPrompt(mode: 'interview' | 'presentation', type?: string): string {
  if (mode === 'interview') {
    if (type === 'behavioral') return BEHAVIORAL_SYSTEM_PROMPT;
    if (type === 'technical') return TECHNICAL_SYSTEM_PROMPT;
    return TECHNICAL_SYSTEM_PROMPT; // Default to technical
  }
  
  // Presentation mode
  if (type === 'pitch') return PITCH_SYSTEM_PROMPT;
  return PRESENTATION_SYSTEM_PROMPT; // Default presentation prompt
}

function getUserPrompt(
  mode: 'interview' | 'presentation',
  type: string | undefined,
  previousQuestion: string,
  previousResponse: string,
  previousMetrics: any,
  previousScore: number,
  context?: string,
  resume?: string,
  jobDescription?: string
): string {
  let prompt = `Mode: ${mode}${type ? ` (${type})` : ''}

PREVIOUS QUESTION:
"${previousQuestion}"

CANDIDATE'S PREVIOUS RESPONSE:
"${previousResponse.slice(0, 2000)}${previousResponse.length > 2000 ? '...' : ''}"

PERFORMANCE METRICS FROM PREVIOUS RESPONSE:
- Pace: ${previousMetrics.pace_wpm} WPM (ideal: 140-160)
- Filler rate: ${previousMetrics.filler_rate_per_min}/min (ideal: ≤2)
- Eye contact: ${Math.round(previousMetrics.eye_contact_pct * 100)}% (ideal: ≥70%)
- Max pause: ${previousMetrics.max_pause_ms}ms (ideal: ≤2000ms)
- Motion energy: ${Math.round(previousMetrics.motion_energy * 100)}% (ideal: 30-60%)
- Overall score: ${previousScore}/100

`;

  if (context) {
    prompt += `CONTEXT: ${context}\n\n`;
  }

  if (resume) {
    prompt += `CANDIDATE'S RESUME (for context):\n${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}\n\n`;
  }

  if (jobDescription) {
    prompt += `JOB DESCRIPTION (for context):\n${jobDescription.substring(0, 800)}${jobDescription.length > 800 ? '...' : ''}\n\n`;
  }

  prompt += `Generate a natural follow-up question that explores what they said, challenges their thinking, or tests related skills. Make it conversational and appropriate for ${mode === 'interview' ? 'an interview' : 'a ' + (type || 'presentation')} setting.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateFollowupRequest = await request.json();
    const {
      mode,
      type,
      context,
      previousQuestion,
      previousResponse,
      previousMetrics,
      previousScore,
      resume,
      jobDescription,
      excludedQuestions,
    } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a default follow-up if no API key
      return NextResponse.json({
        question: 'Can you elaborate on that with a specific example?',
        context: 'Asking for more concrete details',
      } as GenerateFollowupResponse);
    }

    const systemPrompt = getSystemPrompt(mode, type);
    const userPrompt = getUserPrompt(
      mode,
      type,
      previousQuestion,
      previousResponse,
      previousMetrics,
      previousScore,
      context,
      resume,
      jobDescription
    );

    if (excludedQuestions && excludedQuestions.length > 0) {
      let exclusionNote = `\n\nIMPORTANT: Do NOT ask any of these follow-up questions (already asked):`;
      excludedQuestions.forEach((q, i) => {
        exclusionNote += `\n${i + 1}. ${q}`;
      });
      // This could be added to prevent duplicate follow-ups
    }

    console.log('=== FOLLOWUP API - Prompt Details ===');
    console.log('System Prompt:', systemPrompt.substring(0, 200));
    console.log('User Prompt:', userPrompt.substring(0, 300));
    console.log('=====================================');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Teknikly',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API Error:', error);
      return NextResponse.json(
        { error: 'Failed to generate follow-up question' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🔄 FOLLOWUP API Response:', data);

    try {
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed as GenerateFollowupResponse);
    } catch (e) {
      console.error('Failed to parse follow-up response:', e);
      return NextResponse.json({
        question: 'Can you tell us more about that?',
        context: 'Follow-up for deeper understanding',
      } as GenerateFollowupResponse);
    }
  } catch (error) {
    console.error('Error in /api/generate-followup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
