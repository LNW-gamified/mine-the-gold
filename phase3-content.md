# Phase 3 content — Round 2: Dig to Gold, Round 3: Collect the Gold

## Round 2 — Dig to Gold

Same 3 scenarios, rewritten for GovWin-specific grounding and fixed so every
"Gold" statement has a real number (2 of 3 currently don't). New addition:
a pitch-or-dig decision at Dirt and Rock stages (correct answer: always dig),
flipping to a bridge-or-keep-digging decision at Gold (correct answer: now
bridge — this is the "don't pitch early, but don't dig forever either" test).

### Scenario 1 — early visibility
- **Dirt:** "We usually hear about opportunities after they're already pretty far along."
  - Pitch (wrong): *"That's exactly what we solve — want to see a quick demo?"*
  - Dig (correct): *"When in the process does your team typically become aware of those opportunities?"*
- **Rock:** "By the time our capture managers see it, requirements are already shaped around someone else."
  - Pitch (wrong): *"Sounds like you need better visibility — let me show you how we help."*
  - Dig (correct): *"What's that costing you in bids you're qualifying out of too late to really compete?"*
- **Gold:** "Missing strategic opportunities has cost us an estimated $2.8M in pipeline this year — and our VP wants a plan."
  - Bridge (correct): *"That's the $2.8M we can go after together — here's where we start."*
  - Keep digging (wrong): *"Got it — and how many people are on your capture team?"*

### Scenario 2 — proposal quality / win rate
- **Dirt:** "Our proposal timelines keep getting tighter than they used to."
  - Pitch (wrong): *"We can definitely help you move faster — here's the platform."*
  - Dig (correct): *"What's driving the timelines getting tighter?"*
- **Rock:** "Teams end up rushing final submissions because requirements come in late."
  - Pitch (wrong): *"That's a workflow problem we solve every day."*
  - Dig (correct): *"What's that rushing actually done to the quality of what goes out the door?"*
- **Gold:** "Lower-quality proposals have pulled our win rate from 22% to 16% over the last year, and it came up at the last board meeting."
  - Bridge (correct): *"A board-level 6-point drop is worth fixing — here's how we close that gap."*
  - Keep digging (wrong): *"How many proposals do you submit in a typical month?"*

### Scenario 3 — fragmented data / delayed decisions
- **Dirt:** "We're pulling opportunity data from a handful of different places."
  - Pitch (wrong): *"One platform for all of that — let's get you set up."*
  - Dig (correct): *"What happens when those different sources don't agree?"*
- **Rock:** "By the time everyone's numbers line up, the decision window's already closing."
  - Pitch (wrong): *"We centralize all of that so your numbers always match."*
  - Dig (correct): *"What's it cost you when that window closes before you've decided?"*
- **Gold:** "Delayed decisions caused us to miss two recompetes last year, about $2.8M combined — the number our VP now tracks every quarter."
  - Bridge (correct): *"That's exactly the $2.8M we can help you stop losing — here's how."*
  - Keep digging (wrong): *"How many recompetes come up for you in a typical year?"*

---

## Round 3 — Collect the Gold

**Stage A — Three Signs checklist.** Player checks which of 3 conditions
(number / named consequence / right person) are present, sees whether that
adds up to true Gold or still-Rock.

1. *"We're at 16%, down from 22%. That's a few million in awards. It's why my VP is asking."* → all 3 present → **Gold** (this is your own deck's Marcus Chen line, reused directly)
2. *"The CEO has mandated 15% year-over-year growth."* → number ✅, person ✅, consequence ❌ → **Rock.** Next question: *"What happens if you miss that number?"*
3. *"We estimate we've missed more than $3M in potential contract value over the last year."* → number ✅, consequence ✅, person ❌ → **Rock.** Next question: *"Who on your team is tracking that $3M, and what are they doing about it?"*
4. *"Our proposal manager says we're drowning in rework, but nobody's put a number on it."* → person ✅, consequence ✅, number ❌ → **Rock.** Next question: *"If you had to put a number on that, even roughly, what would it be?"*
5. *"Missing strategic opportunities has cost us an estimated $2.8M in pipeline this year — and our VP wants a plan."* → all 3 → **Gold**
6. *"Strategic opportunities are falling through the cracks."* → consequence ✅ only → **Rock**, hardest case (missing 2 of 3)

**Stage B — timed near-miss classification.** Reuses the existing Fool's
Gold card pool, ~8–10 seconds per card. Fixes the authority gap in the
`gold_nugget` cards being used here (was: has number + consequence, never
names who cares):

- `nugget_01` → *"Our VP estimates we've missed more than $3M in potential contract value this year — and wants a plan by next quarter."*
- `nugget_02` → *"Our win rate has declined from 30% to 22%, and our CRO flagged it in the last board update."*
- `nugget_04` → *"The CEO has mandated 15% year-over-year growth, and missing it puts next year's budget at risk."*
- `nugget_06` → *"Proposal rework is consuming hundreds of hours each quarter — our Director of Proposals has flagged it as unsustainable."*

(`fg_01`, `fg_02`, `gold_04`, `gold_05` — the Fool's Gold side — stay as-is,
already solid.)
