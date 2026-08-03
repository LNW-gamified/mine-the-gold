"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DigToGoldBeat } from "@/lib/types";

type OptionKind = "correct" | "wrongQuestion" | "prematurePitch";

interface Option {
  kind: OptionKind;
  text: string;
}

const POINTS: Record<OptionKind, number> = { correct: 2, wrongQuestion: 1, prematurePitch: 0 };

interface RevealCopy {
  correct: string;
  wrongQuestion: string;
  prematurePitch: string;
}

// Per-beat reveal framing, keyed by sequence - dig_to_gold_beats only stores
// the raw response text, not why each one lands the way it does, so that
// reasoning (correct = cause-to-consequence progression, wrongQuestion =
// valid discovery that doesn't build on what was just said, prematurePitch
// = pitching before it's earned) lives here alongside the beats it explains.
const REVEAL_COPY: Record<number, RevealCopy> = {
  1: {
    correct:
      "This asks what's actually blocking early involvement — it gets to the root cause instead of just collecting more data.",
    wrongQuestion:
      "A fair discovery question, but it moves sideways into volume instead of digging into what they just told you.",
    prematurePitch:
      "You're pitching before you've even confirmed why they're getting in late — too early to have earned this.",
  },
  2: {
    correct:
      "This moves the conversation from cause (late awareness) to consequence (competitiveness) — the natural next beat.",
    wrongQuestion: "Useful context for later, but it sidesteps the consequence they just hinted at.",
    prematurePitch: "Still too early — you haven't established what late awareness is actually costing them yet.",
  },
  3: {
    correct:
      "This ties the reactive pattern to something measurable — the bridge from behavior to business impact.",
    wrongQuestion: "Good to know eventually, but it doesn't follow up on the reactive pattern they just named.",
    prematurePitch: "You still haven't quantified what “responding instead of influencing” actually costs them.",
  },
  4: {
    correct: "They just put a number on it — this checks whether that number has reached the people who can act on it.",
    wrongQuestion: "A fine staffing question another time, but it lets a $4M number go by without following up on it.",
    prematurePitch: "They just handed you Gold-tier pain, but pitching here skips confirming who above them actually cares.",
  },
  5: {
    correct: "This asks what's actually at stake if the CRO's plan doesn't land — the real bridge into next steps.",
    wrongQuestion: "Interesting context, but tenure doesn't build on the stakes they just raised.",
    prematurePitch:
      "Even with a CRO mandate on the table, you still haven't confirmed what's riding on it — this jumps straight to the pitch.",
  },
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function outcomeColor(points: number): string {
  if (points === 2) return "var(--gold)";
  if (points === 1) return "var(--rock-label)";
  return "var(--wildcard)";
}

function outcomeHeadline(points: number): string {
  if (points === 2) return "That's the sharpest move.";
  if (points === 1) return "Valid question — but not the sharpest move.";
  return "That's a pitch — too early to have earned it.";
}

export default function Round2DigToGold({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [beats, setBeats] = useState<DigToGoldBeat[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"answering" | "revealed" | "summary">("answering");
  const [options, setOptions] = useState<Option[]>([]);
  const [optionsIndex, setOptionsIndex] = useState(-1);
  const [chosenKind, setChosenKind] = useState<OptionKind | null>(null);
  const [resultsByBeat, setResultsByBeat] = useState<Record<string, OptionKind>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dig_to_gold_beats").select("*").order("sequence");
      if (data) setBeats(data as DigToGoldBeat[]);
    })();
  }, []);

  const current = beats[index];

  // Reshuffles the 3 response positions every time the current beat changes,
  // so the correct answer's on-screen slot isn't a solvable pattern. Adjusted
  // during render (same pattern Round3KnowYourGold's timerIndex reset and
  // app/play/page.tsx's syncedRound use) rather than an effect, so the new
  // options are ready before the "answering" phase ever paints.
  if (current && optionsIndex !== index) {
    setOptionsIndex(index);
    setOptions(
      shuffle([
        { kind: "correct", text: current.correct_response },
        { kind: "wrongQuestion", text: current.wrong_question_response },
        { kind: "prematurePitch", text: current.premature_pitch_response },
      ])
    );
  }

  if (beats.length === 0 || !current) return <p className="text-text-dim">Loading the next beat...</p>;

  function choose(kind: OptionKind) {
    if (phase !== "answering") return;
    setChosenKind(kind);
    setResultsByBeat((prev) => ({ ...prev, [current.id]: kind }));
    setPhase("revealed");
  }

  function next() {
    if (index < beats.length - 1) {
      setIndex((i) => i + 1);
      setChosenKind(null);
      setPhase("answering");
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    const rows = beats.map((beat) => {
      const kind = resultsByBeat[beat.id];
      const points = kind ? POINTS[kind] : 0;
      const correct = points === 2;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 2,
        answer_text: `How would you respond? “${beat.customer_text}”`,
        correct,
        points_awarded: points,
        facilitator_scored: true,
        explanation: !correct && kind ? REVEAL_COPY[beat.sequence][kind] : null,
      };
    });
    await supabase.from("submissions").insert(rows);
    const total = rows.reduce((sum, r) => sum + r.points_awarded, 0);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
    setSubmitting(false);
    setPhase("summary");
  }

  if (phase === "summary") {
    const total = beats.reduce((sum, b) => {
      const kind = resultsByBeat[b.id];
      return sum + (kind ? POINTS[kind] : 0);
    }, 0);

    return (
      <div>
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">You struck {total} points</h3>
        <div className="space-y-2 mb-6">
          {beats.map((beat) => {
            const kind = resultsByBeat[beat.id];
            const points = kind ? POINTS[kind] : 0;
            const correct = points === 2;
            return (
              <div
                key={beat.id}
                className="ore-card-row p-4"
                style={{
                  borderLeft: `4px solid ${outcomeColor(points)}`,
                  background: correct ? "color-mix(in srgb, var(--gold) 8%, var(--surface-raised))" : undefined,
                }}
              >
                <p className="text-sm mb-1">{beat.customer_text}</p>
                <p className="text-xs text-text-dim">
                  {correct ? "Sharpest move" : points === 1 ? "Valid, not sharpest" : "Premature pitch"} &middot; {points} pts
                </p>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <button className="btn btn-gold" onClick={onDone}>Continue digging</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-text-dim text-sm mb-2">
        Beat {index + 1} of {beats.length}
      </p>
      <p className="text-text-dim text-sm mb-6">
        A prospect just said something. What&rsquo;s the best thing to say next?
      </p>

      <div className="statement-card mb-6">
        <p className="text-xs uppercase tracking-widest text-text-dim mb-2">The prospect says:</p>
        <p className="text-lg leading-relaxed">{current.customer_text}</p>
      </div>

      {phase === "answering" && (
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.kind}
              type="button"
              className="ore-card w-full text-left p-4 text-sm"
              onClick={() => choose(opt.kind)}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {phase === "revealed" && chosenKind && (
        <div>
          <p
            className="text-center font-bold mb-4"
            style={{ color: outcomeColor(POINTS[chosenKind]) }}
          >
            {outcomeHeadline(POINTS[chosenKind])}
          </p>
          <div className="ore-card-row p-4 mb-3">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Why</p>
            <p className="text-sm">{REVEAL_COPY[current.sequence][chosenKind]}</p>
          </div>
          {chosenKind !== "correct" && (
            <div className="ore-card-row p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">The sharper move</p>
              <p className="text-sm">{current.correct_response}</p>
            </div>
          )}
          <div className="text-center">
            <button className="btn btn-gold" disabled={submitting} onClick={next}>
              {submitting ? "Locking in..." : index < beats.length - 1 ? "Next" : "See your results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
