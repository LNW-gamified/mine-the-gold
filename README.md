# Mine the Gold — Into the Mine Discovery Challenge

A live, self-paced, multiplayer version of the discovery training game. Reps join in
breakout-room teams from any browser, no login required, and work through 5 rounds on
their own timing. Every round is the same core skill: sort statements into the layer
they actually belong in (Dirt, Rock, Gold, Gold Nugget, or Fool's Gold). Everything
auto-scores. Nothing needs a facilitator to advance it.

## What changed from the first version

- **Sorting, not trivia.** Round 1 and Round 4 now show a batch of cards on a board with
  labeled bins. Reps tap a card, then tap the layer it belongs in, and check their work
  when the whole batch is placed.
- **Fully automatic.** Rounds 2, 3, and the Bonus round used to need a facilitator to score
  free-text answers live. They're now the same tap-to-sort mechanic: Round 2 sorts a
  4-card customer story into the right depth order, Round 3 sorts three candidate
  follow-up questions by how deep each one goes, and the Bonus round sorts transcript
  lines into layers, then picks the strongest next question from three options.
- **Self-paced.** Each team now carries its own `current_round` and advances the moment
  it finishes a round. No facilitator has to press anything during play.
- **The trade-off:** the old Round 3 and Bonus round had reps write their own follow-up
  questions. That's real discovery practice, but there's no reliable way to auto-grade
  open text. The new version has reps recognize the right question out of a set instead
  of writing one from scratch. If you want a written-response version added back in
  alongside this one (scored by you, live, like the first build), say the word.

## What's already built and live

Supabase project `mine-the-gold` is provisioned and seeded with:
- 60 cards across dirt / rock / gold / gold nugget / fool's gold / wild card
- 3 Mine Shaft scenarios (Round 2 depth-ordering content)
- 30 Dig Deeper prompts, 3 tiered follow-up questions for each of the 10 dirt cards
- Row-level security on, an atomic `add_team_points` function for live scoring
- Realtime turned on for `teams` and `sessions` so screens update instantly

## Run it locally

```
npm install
npm run dev
```
Open http://localhost:3000. Open `/facilitator` in one tab to create a room, `/join` in
another (or an incognito window) to play as a team.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, "Add New Project" and import that repo.
3. Add these environment variables in Vercel's project settings (same values as
   `.env.local`, which isn't committed to git):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## Running the workshop

1. Go to `/facilitator`, name the session, click **Create room**. You get a 6-character
   room code.
2. Send reps to `/join`. Each breakout room enters the code plus a team name, then hits
   **Start Round 1** whenever they're ready. No waiting on other teams.
3. Your dashboard shows a live leaderboard with each team's current round and score,
   updating in real time. There's nothing to click to keep the game moving.
4. When you're done, **End session**. Past sessions and team scores stay saved and are
   viewable from the facilitator landing page under "View past sessions."

## What I'd still watch for

- Different teams may finish different dirt cards, tunnel scenarios, and bonus
  transcripts, since content is assigned per team, not per session, so debriefs will
  naturally surface variety. That's a reasonable trade for letting teams move at their
  own pace, but worth naming out loud when you introduce the game.
- The room code is the only access control. Fine for a live workshop, not meant as a
  permanent public tool.
- Test on Deltek's actual network before the live session, not just at home, in case
  Supabase's domain is blocked corporate-side.
