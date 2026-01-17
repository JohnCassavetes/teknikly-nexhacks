// GET /api/overshoot-key - Return OverShoot API key for client SDK
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OVERSHOOT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OverShoot API key not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({ apiKey });
}
