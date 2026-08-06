"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Card } from "@/lib/types";

// 12 cards across all three layers: dirt_01/dirt_08/fg_01/fg_02 sort as
// Dirt, rock_04/rock_05/gold_04/gold_05 as Rock, and nugget_01/nugget_02/
// nugget_04/nugget_06 as the true Gold - straightforward Dirt/Rock/Gold
// reads, no "sounds like a higher tier but isn't" trap framing.
const CODES = [
  "dirt_01", "dirt_08", "fg_01", "fg_02", "rock_04", "rock_05",
  "gold_04", "gold_05", "nugget_01", "nugget_02", "nugget_04", "nugget_06",
];
const POINTS_PER_CARD = 2;
const TIME_LIMIT_SECONDS = 14;

type Bin = "dirt" | "rock" | "gold";

function correctBinFor(category: Card["category"]): Bin {
  if (category === "dirt" || category === "foolsgold") return "dirt";
  if (category === "rock" || category === "gold") return "rock";
  return "gold";
}

const BIN_LABEL: Record<Bin, string> = { dirt: "Dirt", rock: "Rock", gold: "Gold" };

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Round3KnowYourGold({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"intro" | "answering" | "revealed" | "summary">("intro");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [timerIndex, setTimerIndex] = useState(-1);
  const [results, setResults] = useState<Record<string, { correct: boolean; chosen: Bin | null }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cards").select("*").in("code", CODES);
      if (data) {
        const byCode = Object.fromEntries((data as Card[]).map((c) => [c.code, c]));
        setCards(shuffle(CODES.map((c) => byCode[c]).filter(Boolean)));
      }
    })();
  }, []);

  const current = cards[index];

  // Resets the on-screen countdown the moment a new card becomes the
  // "answering" one - adjusted during render (same pattern app/play/page.tsx
  // uses for syncedRound) rather than in an effect, so the reset happens
  // before the interval effect below ever sees the new index.
  if (phase === "answering" && timerIndex !== index) {
    setTimerIndex(index);
    setSecondsLeft(TIME_LIMIT_SECONDS);
  }

  // Per-card countdown: runs only while an unanswered card is showing.
  // Cleared on unmount/index change so a stale timer from a previous card
  // can never fire after the player has already moved on.
  useEffect(() => {
    if (phase !== "answering" || !current) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleClassify(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  if (cards.length === 0) return <p className="text-text-dim">Loading the next challenge...</p>;

  if (phase === "intro") {
    return (
      <div>
        <p className="text-xs uppercase tracking-widest text-text-dim mb-2 text-center">Before you sort</p>
        <h2 className="text-xl font-bold gold-text-shimmer mb-4 text-center">What actually makes it Gold?</h2>
        <p className="text-text-dim text-sm mb-6 text-center">
          A statement is only Gold when both of these are true: the E and C in MEDDPICC. Missing either, and
          it&rsquo;s still Rock.
        </p>
        <div className="space-y-3 mb-6">
          <div className="ore-card-row p-4">
            <p className="text-sm text-gold font-bold mb-1">Economic Impact</p>
            <p className="text-xs text-text-dim">A real cost: money, deals, or targets at risk. Something you could actually size.</p>
          </div>
          <div className="ore-card-row p-4">
            <p className="text-sm text-gold font-bold mb-1">Compelling Event</p>
            <p className="text-xs text-text-dim">Why it matters right now: a deadline, a losing streak, a number that just moved.</p>
          </div>
        </div>
        <p className="text-text-dim text-xs mb-6 text-center">
          Now sort {cards.length} statements as Dirt, Rock, or Gold, {TIME_LIMIT_SECONDS} seconds each. No time
          to overthink it.
        </p>
        <div className="text-center">
          <button className="btn btn-gold" onClick={() => setPhase("answering")}>Start the timer</button>
        </div>
      </div>
    );
  }

  function handleClassify(binKey: Bin | null) {
    if (phase !== "answering") return;
    const correct = binKey === correctBinFor(current.category);
    setResults((prev) => ({ ...prev, [current.id]: { correct, chosen: binKey } }));
    setPhase("revealed");
  }

  function next() {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setPhase("answering");
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    const rows = cards.map((card) => {
      const result = results[card.id] ?? { correct: false, chosen: null };
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 3,
        card_id: card.id,
        placed_category: result.chosen,
        correct: result.correct,
        points_awarded: result.correct ? POINTS_PER_CARD : 0,
        facilitator_scored: true,
        explanation: card.explanation,
      };
    });
    await supabase.from("submissions").insert(rows);
    const total = rows.reduce((sum, r) => sum + r.points_awarded, 0);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
    setSubmitting(false);
    setPhase("summary");
  }

  if (phase === "summary") {
    const total = Object.values(results).filter((r) => r.correct).length * POINTS_PER_CARD;
    return (
      <div>
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">You struck {total} points</h3>
        <div className="space-y-2 mb-6">
          {cards.map((card) => {
            const result = results[card.id];
            return (
              <div
                key={card.id}
                className="ore-card-row p-4"
                style={{ borderLeft: `4px solid ${result?.correct ? "var(--gold)" : "var(--wildcard)"}` }}
              >
                <p className="text-sm mb-1">{card.text}</p>
                <p className="text-xs text-text-dim">
                  {result?.chosen === null ? "Missed (out of time)" : result?.correct ? "Correct" : "Missed"} &middot;{" "}
                  {result?.correct ? POINTS_PER_CARD : 0} pts
                </p>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <button className="btn btn-gold" disabled={submitting} onClick={onDone}>
            {submitting ? "Locking in..." : "Finish the dig"}
          </button>
        </div>
      </div>
    );
  }

  const result = results[current.id];
  const correctBin = correctBinFor(current.category);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-text-dim mb-2 text-center">
        Under Pressure &middot; {index + 1} of {cards.length}
      </p>
      <p className="text-text-dim text-sm mb-4 text-center">
        Dirt, Rock, or Gold? Sort each one before the clock runs out.
      </p>

      {phase === "answering" && (
        <div className="mb-4">
          <p
            className={`text-center font-bold stencil text-4xl mb-2 ${secondsLeft <= 3 ? "timer-urgent" : ""}`}
            style={{ color: secondsLeft <= 3 ? "var(--wildcard)" : "var(--gold)" }}
          >
            {secondsLeft}s
          </p>
          <div className="timer-track">
            <div
              className="timer-fill"
              style={{
                width: `${(secondsLeft / TIME_LIMIT_SECONDS) * 100}%`,
                background: secondsLeft <= 3 ? "var(--wildcard)" : "var(--gold)",
              }}
            />
          </div>
        </div>
      )}

      <div className="statement-card mb-6">
        <p className="text-lg leading-relaxed">{current.text}</p>
      </div>

      {phase === "answering" && (
        <div className="grid grid-cols-3 gap-3">
          <button className="btn btn-dirt" onClick={() => handleClassify("dirt")}>Dirt</button>
          <button className="btn btn-rock" onClick={() => handleClassify("rock")}>Rock</button>
          <button className="btn btn-gold" onClick={() => handleClassify("gold")}>Gold</button>
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <p
            className="text-center font-bold mb-4"
            style={{ color: result?.correct ? "var(--gold)" : "var(--wildcard)" }}
          >
            {result?.chosen === null
              ? "Out of time: here's the answer."
              : result?.correct
                ? "Correct."
                : "Not quite."}
          </p>
          <div className="ore-card-row p-4 mb-3">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Correct classification</p>
            <p className="text-sm text-gold font-bold">{BIN_LABEL[correctBin]}</p>
          </div>
          {current.category === "gold_nugget" && (
            <div className="ore-card-row p-4 mb-3">
              <p className="text-sm text-gold font-bold">
                This is Gold: Economic Impact and Compelling Event, the E and C in MEDDPICC.
              </p>
            </div>
          )}
          {current.explanation && (
            <div className="ore-card-row p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Why</p>
              <p className="text-sm">{current.explanation}</p>
            </div>
          )}
          <div className="text-center">
            <button className="btn btn-gold" disabled={submitting} onClick={next}>
              {submitting ? "Locking in..." : index < cards.length - 1 ? "Next card" : "See your results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
