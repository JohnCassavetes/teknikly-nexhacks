// POST /api/generate-questions - Generate interview questions based on resume, job description, or surprise me
import { NextRequest, NextResponse } from 'next/server';
import { InterviewQuestion, InterviewQuestionSource } from '@/lib/types';

interface GenerateQuestionsRequest {
  type: 'behavioral' | 'technical'; // Interview type
  source: InterviewQuestionSource;
  resume?: string; // Parsed resume text
  jobDescription?: string; // Job description text
  excludedQuestions?: string[]; // Questions to avoid regenerating
}

interface GenerateQuestionsResponse {
  questions: InterviewQuestion[];
  source: InterviewQuestionSource;
  resumeHighlights?: string[];
}

function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const BEHAVIORAL_SYSTEM_PROMPT = `You are an expert behavioral interview coach. Generate 5 thoughtful behavioral interview questions.

These questions should:
- Follow the STAR method format (asking about specific situations, tasks, actions, results)
- Be challenging but fair
- Help assess soft skills, leadership, teamwork, problem-solving, and cultural fit
- Be specific enough to elicit detailed responses

Respond with JSON only:
{
  "questions": [
    { "question": "Tell me about a time when...", "context": "Why this question matters or what it assesses" },
    ...
  ],
  "resumeHighlights": ["key point 1", "key point 2"] // Only if resume was provided
}`;

const TECHNICAL_SYSTEM_PROMPT = `You are an expert technical interview coach. Generate 5 thoughtful technical interview questions (verbal, not coding).

These questions should:
- Test understanding of concepts, system design, or problem-solving approaches
- Be relevant to the candidate's background or the job requirements
- Require verbal explanation and discussion, not coding
- Cover a range of difficulty levels

Respond with JSON only:
{
  "questions": [
    { "question": "Explain how you would design...", "context": "Why this question matters or what it assesses" },
    ...
  ],
  "resumeHighlights": ["key point 1", "key point 2"] // Only if resume was provided
}`;

function getSystemPrompt(type: 'behavioral' | 'technical'): string {
  return type === 'behavioral' ? BEHAVIORAL_SYSTEM_PROMPT : TECHNICAL_SYSTEM_PROMPT;
}

function getUserPrompt(
  type: 'behavioral' | 'technical',
  source: InterviewQuestionSource,
  resume?: string,
  jobDescription?: string,
  excludedQuestions?: string[]
): string {
  let prompt = `Interview Type: ${type}\nQuestion Generation Mode: ${source}\n\n`;

  if (source === 'resume' && resume) {
    prompt += `RESUME CONTENT:\n${resume}\n\n`;
    prompt += `Generate 5 ${type} interview questions tailored to this candidate's experience and skills. Reference specific projects, skills, or experiences from their resume when appropriate.\n`;
  } else if (source === 'job_description' && jobDescription) {
    prompt += `JOB DESCRIPTION:\n${jobDescription}\n\n`;
    prompt += `Generate 5 ${type} interview questions that would be asked for this specific role. Focus on the key requirements and responsibilities mentioned.\n`;
    if (resume) {
      prompt += `\nCANDIDATE RESUME (for context):\n${resume}\n`;
      prompt += `Also consider the candidate's background when generating questions.\n`;
    }
  } else {
    // Surprise me mode
    prompt += `Generate 5 common but challenging ${type} interview questions that are frequently asked in professional interviews. Mix different topics and difficulty levels.\n`;
    if (resume) {
      prompt += `\nCANDIDATE RESUME (for personalization):\n${resume}\n`;
      prompt += `You may personalize some questions to the candidate's background if relevant.\n`;
    }
  }

  if (excludedQuestions && excludedQuestions.length > 0) {
    prompt += `\nIMPORTANT: Do NOT generate any of these questions (the user has already rejected them):\n`;
    excludedQuestions.forEach((q, i) => {
      prompt += `${i + 1}. ${q}\n`;
    });
    prompt += `\nGenerate completely different questions.\n`;
  }

  return prompt;
}

// Default questions when API is unavailable
function getDefaultQuestions(type: 'behavioral' | 'technical'): InterviewQuestion[] {
  if (type === 'behavioral') {
    return [
      { id: generateQuestionId(), question: "Tell me about a time when you had to deal with a difficult team member. How did you handle the situation?", context: "Assesses conflict resolution and interpersonal skills" },
      { id: generateQuestionId(), question: "Describe a situation where you had to make a decision with incomplete information. What was your approach?", context: "Evaluates decision-making under uncertainty" },
      { id: generateQuestionId(), question: "Give me an example of a time you failed at something. How did you handle it and what did you learn?", context: "Tests self-awareness and growth mindset" },
      { id: generateQuestionId(), question: "Tell me about a project where you had to persuade others to see things your way. What was your strategy?", context: "Assesses influence and communication skills" },
      { id: generateQuestionId(), question: "Describe a time when you had to balance multiple competing priorities. How did you manage your time?", context: "Evaluates time management and prioritization" },
    ];
  } else {
    return [
      { id: generateQuestionId(), question: "Walk me through how you would design a URL shortening service like bit.ly.", context: "Tests system design thinking and scalability considerations" },
      { id: generateQuestionId(), question: "Explain the difference between SQL and NoSQL databases. When would you use each?", context: "Evaluates understanding of data storage concepts" },
      { id: generateQuestionId(), question: "How would you optimize a slow database query? Walk me through your debugging process.", context: "Tests performance optimization knowledge" },
      { id: generateQuestionId(), question: "Explain how you would ensure the security of a web application. What are the key considerations?", context: "Assesses security awareness and best practices" },
      { id: generateQuestionId(), question: "Describe the trade-offs between microservices and monolithic architecture. When would you choose each?", context: "Tests architectural decision-making skills" },
    ];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await request.json();
    const { type, source, resume, jobDescription, excludedQuestions } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return default questions if no API key
      const defaultQuestions = getDefaultQuestions(type);
      return NextResponse.json({
        questions: defaultQuestions,
        source,
        resumeHighlights: resume ? ['Unable to extract highlights without API key'] : undefined,
      } as GenerateQuestionsResponse);
    }

    const systemPrompt = getSystemPrompt(type);
    const userPrompt = getUserPrompt(type, source, resume, jobDescription, excludedQuestions);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TalkCoach',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8, // Higher temperature for variety
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, await response.text());
      return NextResponse.json({
        questions: getDefaultQuestions(type),
        source,
      } as GenerateQuestionsResponse);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        questions: getDefaultQuestions(type),
        source,
      } as GenerateQuestionsResponse);
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        questions: getDefaultQuestions(type),
        source,
      } as GenerateQuestionsResponse);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Add IDs to questions
    const questions: InterviewQuestion[] = parsed.questions.map((q: { question: string; context?: string }) => ({
      id: generateQuestionId(),
      question: q.question,
      context: q.context,
    }));

    return NextResponse.json({
      questions,
      source,
      resumeHighlights: parsed.resumeHighlights,
    } as GenerateQuestionsResponse);
  } catch (error) {
    console.error('Failed to generate questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
