# TalkCoach (Hackathon MVP)

An app that gives **real-time coaching + live scoring** for public speaking and interpersonal communication (e.g., interviews).  
It analyzes **body language** and **speech** in real time, then generates a **post-session report** with strengths + specific improvements.

This README is written so another LLM (Claude) can implement the project quickly.

---

## MVP Scope (24-hour build)

### What the demo must show
1. User selects a mode:
   - **Presentation / Stand-up**
   - **Interview**
2. User enters a “practice room” and speaks for 60–180 seconds.
3. During the session, the app shows:
   - **Live transcript**
   - **Live coaching cues** (small badges like “Slow down”, “Reduce fillers”, “Look at camera”)
   - **Live score** (0–100) updating every ~2 seconds
4. When the session ends, the app shows a report:
   - Overall score + mini trend chart
   - Key stats (WPM, filler rate, eye-contact %, pause count)
   - **Top 3 improvements** (actionable)
   - **Top 2 strengths**
5. Session history (last 5) stored locally (localStorage). Optional: Supabase.

---

## Tech Stack

- **Next.js (App Router) + TypeScript** (deploy on Vercel)
- **LiveKit**: real-time media transport (camera + mic streaming)
- **OverShoot**: real-time body language analysis (pose/face/gaze signals)
- **Wispr Flow**: speech-to-text (live transcript)
- **ElevenLabs** (optional): text-to-speech for audible coaching
- **LLM reasoning**: Gemini *or* OpenAI API for generating coaching suggestions + post-session report
- **Charts**: lightweight (e.g., Recharts) for score trend
- **State**: client-side state + localStorage (fastest)

---

## Product Behavior (How it should feel)

### Real-time coaching cues (keep simple)
The app should continuously compute a handful of signals and map them to cues:

**Speech signals**
- `pace_wpm` (words per minute): too fast / too slow
- `filler_rate` (fillers per minute): “um/uh/like/you know”
- `pause_count` and `max_pause_ms`: awkward pauses

**Body signals (from OverShoot)**
- `eye_contact_pct`: looking at camera vs away (proxy)
- `motion_energy`: too still vs too jittery (pose movement)

### Live score
Compute a stable score 0–100, updated every ~2 seconds and smoothed.
Suggested weights:
- Pace: 25%
- Fillers: 25%
- Eye contact: 25%
- Pauses: 15%
- Motion/energy: 10%

### Post-session report
Use the final aggregated metrics + transcript to produce:
- strengths (2 bullets)
- improvements (3 bullets)
- a “next session goal” (one measurable goal)

---

## High-Level Architecture

Client does:
- Capture camera/mic
- Join LiveKit room
- Render video + UI
- Subscribe to OverShoot results (body signals)
- Subscribe to Wispr Flow results (live transcript)
- Compute live metrics + live score
- Call `/api/coach` periodically for a single short suggestion
- Call `/api/report` once at end for final report

Server (Vercel API routes) does:
- LLM calls (OpenAI or Gemini)
- Optional: ElevenLabs TTS generation endpoint for “coach voice”

---

## Data Flow

### During session (every ~2 seconds)
Client maintains a rolling window:
- recent transcript text (last ~15–30s)
- recent speech stats (wpm, filler count, pauses)
- recent body stats (eye contact, motion)

Client updates:
- UI cue badges
- score gauge
- trend line (append score datapoint)

Optionally every ~10–15 seconds:
- POST to `/api/coach` with: mode, last transcript chunk, metrics snapshot
- Server returns: `one_sentence_tip` + `priority` (e.g., "pace")

### At end of session
Client sends:
- full transcript
- aggregated metrics
- score trend series
POST to `/api/report`
Server returns:
- strengths (array)
- improvements (array)
- next_goal (string)
- short summary paragraph

---

## Repository Structure (suggested)

/app
/page.tsx # landing: mode select + start
/practice/page.tsx # main practice room UI
/report/page.tsx # report view (or route with session id)
/history/page.tsx # local session history
/api
/coach/route.ts # LLM tip generation
/report/route.ts # LLM post-session report
/tts/route.ts # optional ElevenLabs audio response
/lib
livekit.ts # LiveKit helpers
overshoot.ts # OverShoot wrapper integration
wispr.ts # Wispr Flow wrapper integration
scoring.ts # metrics + scoring computation
storage.ts # localStorage session save/load
/components
PracticeRoom.tsx
LiveTranscript.tsx
ScoreGauge.tsx
CueBadges.tsx
TrendChart.tsx
ModePicker.tsx


---

## UI Requirements (Hackathon-friendly)

### Landing page
- App name + one sentence description
- Mode cards: Presentation / Interview
- “Start Practice” button

### Practice room page
Left:
- video preview (self view)
- optional teleprompter prompt card
Right:
- Live score (big)
- Cue badges (4–6)
- Live transcript (scrolling)
Bottom:
- Start / Stop buttons
- Timer

### Report page
- Overall score + chart
- Key stats panel
- Strengths + Improvements
- Next goal
- “Practice again” button

### History page
- last 5 sessions: mode, date, score
- quick trend chart

---

## Key Integrations

### 1) LiveKit
- Use LiveKit JS client to join a room.
- Publish local audio/video.
- Render local video track in the UI.

**Note:** For hackathon, you can run analysis on the local tracks without needing remote participants. LiveKit’s value here is clean RTC plumbing + future multi-user extension.

### 2) OverShoot (body language)
Goal: get real-time signals from camera frames.
We assume OverShoot provides something like:
- `eyeContactScore` (0..1) OR gaze direction info
- `poseLandmarks` / `motionScore`
- maybe `confidence` or `postureScore`

Wrap it in `lib/overshoot.ts`:
- init(model)
- start(videoElement, callback)
- callback emits `{ eye_contact_pct, motion_energy, posture_score? }` ~5–10 fps

### 3) Wispr Flow (speech-to-text)
Goal: live transcript updates + timestamps.
We assume it can:
- stream partial transcripts
- emit final transcript segments

Wrap it in `lib/wispr.ts`:
- init()
- start(audioTrack, onPartial, onFinal)
- stop()

From transcripts compute:
- words per minute (rolling window)
- filler word count (rolling window)
- pauses (gap between final segments)

### 4) ElevenLabs (text-to-speech) [Optional]
Only generate audio for:
- session start “Ready when you are”
- occasional coaching tip (max every ~15 seconds, only if user toggles “Voice Coach”)

Keep it simple:
- `/api/tts` returns an audio buffer for a given short text

### 5) Gemini or OpenAI (LLM)
Use for:
- `/api/coach`: one short “what to change right now” sentence
- `/api/report`: post-session structured report

---

## API Contracts

### POST `/api/coach`
**Request**
```json
{
  "mode": "interview" | "presentation",
  "recent_transcript": "string (last 10-30s)",
  "metrics": {
    "pace_wpm": 155,
    "filler_rate_per_min": 6,
    "eye_contact_pct": 0.62,
    "max_pause_ms": 1800,
    "motion_energy": 0.35
  }
}



Response
{
  "tip": "Slow down slightly and end sentences cleanly—aim ~150 WPM.",
  "priority": "pace"
}

POST /api/report

Request
{
  "mode": "interview" | "presentation",
  "full_transcript": "string",
  "aggregates": {
    "avg_wpm": 168,
    "filler_total": 22,
    "filler_rate_per_min": 7,
    "eye_contact_pct": 0.58,
    "pause_count": 5,
    "max_pause_ms": 2400
  },
  "score_series": [
    { "t": 0, "score": 61 },
    { "t": 2, "score": 64 }
  ]
}
Response
{
  "overall_summary": "You were clear and energetic, but your pace sped up when you got excited.",
  "strengths": [
    "Good energy and clear articulation.",
    "You stayed on-topic and finished thoughts."
  ],
  "improvements": [
    "Reduce fillers by replacing 'um' with a 1-second pause.",
    "Aim for 140–160 WPM—slow down at sentence ends.",
    "Look at the camera when making key points (target 70%+)."
  ],
  "next_goal": "Next session: keep filler rate under 3/min for 2 minutes."
}


Scoring Logic (deterministic)

Implement in lib/scoring.ts:

Normalize each metric to 0..1 subscore:

Pace ideal band: 140–160 wpm

Filler ideal: <= 2/min

Eye contact ideal: >= 0.7

Pauses: penalize max_pause_ms > 2000

Motion: penalize extremes (too low or too high)

Weighted average → 0..100

Apply smoothing:

score = 0.7 * prev_score + 0.3 * new_score