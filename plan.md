# Project Kalnehi: The AI Study Parole Officer

## Architecture Rules
- Next.js App Router (app/ directory).
- Tailwind CSS. Theme: Clean, pleasant, and trustworthy. Use a crisp white background, soft slate text for high readability, and a calming but clear primary blue (blue-500) for buttons and accents. Mobile-first design.
- Supabase for Database & Auth.
- API Routes (`app/api/...`) for backend logic.

## The Database Schema (Supabase)
1. `users`: id, target_exam, created_at
2. `micro_topics`: id, subject, chapter, weightage_score (1-10), est_minutes, prerequisite_id
3. `user_progress`: id, user_id, topic_id, status, next_revision_date

## The Core Loop
1. User holds a prominent, inviting blue "CONFESS" mic button on the UI.
2. Web `MediaRecorder` captures the audio Blob and POSTs it via FormData to `/api/confess`.
3. Backend Route: 
   - Groq Whisper API transcribes the audio.
   - Claude 3.5 Sonnet extracts constraints (hours, energy) and generates a firm but helpful reality check.
   - Supabase calculates a new daily schedule (Triage Mode: prioritizes high-weightage topics that fit the hours).
   - OpenAI TTS turns the AI text into an audio buffer.
4. Client plays the audio and updates the UI with today's optimized task list.