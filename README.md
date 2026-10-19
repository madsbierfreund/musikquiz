# Musikquiz buzzer

Real-time two-team buzzer. Players open `/` on their phones, pick a name and team, and tap. The quizmaster screen (`/host`, e.g. an iPad on a speaker) shows the winning team's colour and name and plays the team's sound. "Ny runde" (or the space bar) starts a new round.

Fairness: each phone syncs its clock with the Supabase server; a press is sent with the time the finger touched the screen. The server waits 300 ms after the first press arrives and picks the earliest touch.

## Setup
1. Run the SQL (tables `buzzer_rounds`, `buzzer_presses` and the `buzzer_*` functions) in the Supabase SQL Editor.
2. In Vercel, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
