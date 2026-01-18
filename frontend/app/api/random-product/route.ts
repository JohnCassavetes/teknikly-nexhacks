// POST /api/random-product - Generate a random product for sales pitch practice
import { NextRequest, NextResponse } from 'next/server';

interface RandomProductRequest {
  category?: string; // Optional category like 'car', 'tech', 'food', etc.
}

const SYSTEM_PROMPT = `You are a creative product generator for sales pitch practice. Generate a specific, interesting product that someone could practice pitching.

The product should be:
- Specific (not just "a car" but "a 2024 Tesla Model S Plaid")
- Interesting enough to make a compelling pitch
- Realistic (something that could actually exist)

Respond with JSON only:
{
  "product": "The specific product name",
  "description": "A brief 1-sentence description of the product",
  "key_features": ["feature 1", "feature 2", "feature 3"]
}`;

// Fallback products if API is unavailable
const FALLBACK_PRODUCTS = [
  {
    product: "Smart Water Bottle with Hydration Tracking",
    description: "A high-tech water bottle that tracks your daily water intake and reminds you to stay hydrated.",
    key_features: ["LED hydration reminders", "App connectivity", "Temperature display"]
  },
  {
    product: "Noise-Canceling Sleep Headband",
    description: "A comfortable headband with built-in speakers for better sleep.",
    key_features: ["Ultra-thin speakers", "Sleep tracking", "8-hour battery life"]
  },
  {
    product: "Portable Espresso Maker",
    description: "A handheld device that makes barista-quality espresso anywhere.",
    key_features: ["No electricity needed", "Travel-friendly", "Works with pods or grounds"]
  },
  {
    product: "AI-Powered Pet Feeder",
    description: "An automatic pet feeder with camera and treat dispenser you control from your phone.",
    key_features: ["HD camera with night vision", "Voice interaction", "Scheduled feeding"]
  },
  {
    product: "Foldable Electric Scooter",
    description: "A lightweight, foldable electric scooter perfect for urban commuting.",
    key_features: ["15-mile range", "Folds in 3 seconds", "Built-in phone charger"]
  }
];

export async function POST(request: NextRequest) {
  try {
    const body: RandomProductRequest = await request.json();
    const { category } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Return a random fallback product
      const randomProduct = FALLBACK_PRODUCTS[Math.floor(Math.random() * FALLBACK_PRODUCTS.length)];
      return NextResponse.json(randomProduct);
    }

    let userPrompt = 'Generate a random product for someone to practice their sales pitch on.';
    
    if (category && category.trim()) {
      userPrompt = `Generate a specific product in the "${category}" category for someone to practice their sales pitch on. Be creative and specific.`;
    }

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
        max_tokens: 200,
        temperature: 0.9, // Higher temperature for more variety
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', await response.text());
      const randomProduct = FALLBACK_PRODUCTS[Math.floor(Math.random() * FALLBACK_PRODUCTS.length)];
      return NextResponse.json(randomProduct);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      // Return fallback if parsing fails
      const randomProduct = FALLBACK_PRODUCTS[Math.floor(Math.random() * FALLBACK_PRODUCTS.length)];
      return NextResponse.json(randomProduct);
    }
  } catch (error) {
    console.error('Random product API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate random product' },
      { status: 500 }
    );
  }
}
