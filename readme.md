Perfect — here’s a **clean, explicit, Claude-friendly README.md** that **locks in the stack**:

* ✅ LiveKit
* ✅ OverShoot
* ✅ Wispr Flow
* ✅ ElevenLabs
* ✅ **OpenRouter (instead of OpenAI / Gemini keys)**
* ✅ Built to ship on **Vercel in <24h**

This is written so Claude can **implement without guessing**.

---

```md
# EasySpeech — Hackathon MVP

**EasySpeech** is a real-time communication coach for public speaking and interpersonal scenarios (interviews, presentations, stand-up).

It analyzes **speech + body language in real time**, gives **live coaching cues and scoring**, and produces a **post-session improvement report**.

This README is optimized so an LLM (Claude) can build the project end-to-end.

---

## Core Stack (Fixed — do not substitute)

- **Next.js (App Router) + TypeScript**
- **Vercel** (deployment)
- **LiveKit** — real-time audio/video transport
- **OverShoot** — real-time body language & pose analysis
- **Wispr Flow** — real-time speech-to-text
- **ElevenLabs** — optional text-to-speech coaching voice
- **OpenRouter** — LLM reasoning (coaching + reports)

---

## MVP Goal (24-hour scope)

Deliver a **single-user live coaching room** with:

1. Live camera + mic
2. Live transcript
3. Live coaching cues
4. Live score (0–100)
5. Post-session report
6. Local session history

No auth, no uploads, no persistence beyond localStorage.

---

## User Flow

1. User selects mode:
   - `Presentation`
   - `Interview`
2. User enters practice room
3. User speaks for 60–180 seconds
4. App shows **live feedback**
5. User ends session
6. App shows **report + improvements**

---

## Real-Time Signals (Minimum Required)

### Speech (via Wispr Flow)
- `pace_wpm`
- `filler_rate_per_min`
- `pause_count`
- `max_pause_ms`

### Body Language (via OverShoot)
- `eye_contact_pct` (camera-facing proxy)
- `motion_energy` (pose movement)

These are the **only required signals** for MVP.

---

## Live Coaching Cues (UI)

Show small badges that activate when thresholds are crossed:

- **Slow Down**
- **Reduce Fillers**
- **Look at the Camera**
- **Project Confidence**

Only show **1–2 cues at a time**.

---

## Scoring System (Deterministic)

Score updates every ~2 seconds and is smoothed.

| Signal          | Weight |
|-----------------|--------|
| Pace            | 25%    |
| Fillers         | 25%    |
| Eye Contact     | 25%    |
| Pauses          | 15%    |
| Motion/Energy   | 10%    |

Score = weighted average → 0–100  
Apply smoothing:  
`score = 0.7 * prev + 0.3 * current`

---

## Post-Session Report (LLM)

Generated **once**, after session ends.

Includes:
- Summary paragraph
- 2 strengths
- 3 improvements
- 1 measurable next goal

---

## Architecture Overview

```

Camera + Mic
↓
LiveKit
↓
┌───────────────┐
│ Client (Next) │
└───────────────┘
│        │
│        ├── OverShoot → body signals
│        ├── Wispr Flow → transcript
│        └── Scoring engine (local)
│
├── /api/coach  → OpenRouter (live tip)
├── /api/report → OpenRouter (final report)
└── /api/tts    → ElevenLabs (optional)

```

---

## Repository Structure

```

/app
/page.tsx              # landing (mode select)
/practice/page.tsx     # live practice room
/report/page.tsx       # post-session report
/history/page.tsx      # local session history

/api
/coach/route.ts        # OpenRouter live tip
/report/route.ts       # OpenRouter report
/tts/route.ts          # ElevenLabs TTS

/lib
livekit.ts             # LiveKit helpers
overshoot.ts           # OverShoot wrapper
wispr.ts               # Wispr Flow wrapper
scoring.ts             # metrics + score logic
storage.ts             # localStorage helpers

/components
VideoPanel.tsx
LiveTranscript.tsx
ScoreGauge.tsx
CueBadges.tsx
TrendChart.tsx
ModePicker.tsx

````

---

## Integration Details

### LiveKit
- Use LiveKit JS SDK
- Single-user room is sufficient
- Capture audio + video tracks
- Render local video track

### OverShoot
Wrap in `lib/overshoot.ts`

Expected output shape:
```ts
{
  eye_contact_pct: number;   // 0..1
  motion_energy: number;     // 0..1
}
````

Update frequency: ~5–10 fps

---

### Wispr Flow

Wrap in `lib/wispr.ts`

Expected behavior:

* Emit partial transcripts
* Emit final segments with timestamps

From Wispr:

* Compute WPM (rolling window)
* Count filler words
* Detect pauses via timestamp gaps

---

### ElevenLabs (Optional)

Used only if **Coach Voice** is enabled.

* Short coaching phrases only
* Max once every ~15 seconds

---

### OpenRouter (LLM)

**Do NOT use OpenAI or Gemini keys directly**

All LLM calls go through OpenRouter.

#### Models (suggested)

* `anthropic/claude-3.5-sonnet`
* fallback: `google/gemini-1.5-pro`

---

## API Contracts

### POST `/api/coach`

Used during session (every 10–15s)

**Request**

```json
{
  "mode": "interview" | "presentation",
  "recent_transcript": "string",
  "metrics": {
    "pace_wpm": 160,
    "filler_rate_per_min": 5,
    "eye_contact_pct": 0.6,
    "max_pause_ms": 1800,
    "motion_energy": 0.4
  }
}
```

**Response**

```json
{
  "tip": "Slow down slightly and finish sentences cleanly.",
  "priority": "pace"
}
```

---

### POST `/api/report`

Used once after session

**Response**

```json
{
  "overall_summary": "You communicated clearly but sped up under pressure.",
  "strengths": [
    "Clear articulation",
    "Good energy"
  ],
  "improvements": [
    "Reduce filler words by pausing instead of saying 'um'",
    "Slow pace to ~150 WPM",
    "Increase eye contact to 70%+"
  ],
  "next_goal": "Next session: keep fillers under 3 per minute for 2 minutes."
}
```

---

## Environment Variables

`.env.local`

```
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

WISPR_FLOW_API_KEY=
OVERSHOOT_API_KEY=

OPENROUTER_API_KEY=

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

---

## Scoring Thresholds

| Metric        | Ideal Range |
| ------------- | ----------- |
| Pace          | 140–160 WPM |
| Fillers       | ≤ 2 / min   |
| Eye Contact   | ≥ 0.7       |
| Max Pause     | ≤ 2000 ms   |
| Motion Energy | 0.3–0.6     |

---

## Hackathon Shortcuts (Allowed)

* If Wispr Flow fails → fallback to browser SpeechRecognition
* If OverShoot fails → stub signals with webcam gaze proxy
* LiveKit can run locally for demo

---

## Definition of Done

A judge can:

* Start a session
* Speak for 1 minute
* See live transcript, score, and cues
* Stop session
* See a clear report with improvements

---

## License

MIT

```

---

If you want, I can next:
- Write the **exact OpenRouter prompts** (coach + report)
- Write the **scoring.ts** implementation
- Or give you a **LiveKit + Wispr + OverShoot wiring order** so you don’t deadlock on setup

Just tell me which one.
```
