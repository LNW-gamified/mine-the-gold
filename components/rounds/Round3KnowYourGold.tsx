"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Card, GoldChecklistItem } from "@/lib/types";

const CHECKLIST_POINTS_PER_FLAG = 1;

// 12 cards across all three layers, not just the Gold/Fool's-Gold pair:
// fg_01/fg_02 are vague enough to sort as Dirt, gold_04/gold_05 are real
// consequences with no number yet (Rock, not Gold), and the gold_nugget
// cards (rewritten in phase3-content.md to close an authority gap - each
// now names who cares, not just a number and a consequence) are the true
// Gold. dirt_01/dirt_08 and rock_04/rock_05 round out each layer so the
// sort isn't just "is this Gold or not" but the full three-way read.
const STAGE_B_CODES = [
  "dirt_01", "dirt_08", "fg_01", "fg_02", "rock_04", "rock_05",
  "gold_04", "gold_05", "nugget_01", "nugget_02", "nugget_04", "nugget_06",
];
const STAGE_B_POINTS = 2;
const TIME_LIMIT_SECONDS = 9;

type StageBBin = "dirt" | "rock" | "gold";

function correctBinFor(category: Card["category"]): StageBBin {
  if (category === "dirt" || category === "foolsgold") return "dirt";
  if (category === "rock" || category === "gold") return "rock";
  return "gold";
}

const STAGE_B_BIN_LABEL: Record<StageBBin, string> = { dirt: "Dirt", rock: "Rock", gold: "Gold" };

interface ChecklistFlags {
  has_number: boolean;
  has_consequence: boolean;
  has_right_person: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function flagLabel(key: keyof ChecklistFlags): string {
  if (key === "has_number") return "Has a number?";
  if (key === "has_consequence") return "Names a consequence?";
  return "Right person?";
}

function flagNoun(key: keyof ChecklistFlags): string {
  if (key === "has_number") return "a number";
  if (key === "has_consequence") return "a named consequence";
  return "the right person";
}

function checklistExplanation(item: GoldChecklistItem): string {
  const present: string[] = [];
  const missing: string[] = [];
  (["has_number", "has_consequence", "has_right_person"] as const).forEach((key) => {
    (item[key] ? present : missing).push(flagNoun(key));
  });
  const verdict = item.is_gold ? "Gold" : "still Rock";
  const base = `${present.length > 0 ? `Has ${present.join(" and ")}` : "Missing all three signs"}${
    missing.length > 0 ? `, but missing ${missing.join(" and ")}` : ""
  } — that's ${verdict}.`;
  return item.next_question ? `${base} Next question: “${item.next_question}”` : base;
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
  const [stage, setStage] = useState<"stageA" | "stageATransition" | "stageB" | "summary">("stageA");

  // Stage A
  const [checklistItems, setChecklistItems] = useState<GoldChecklistItem[]>([]);
  const [aIndex, setAIndex] = useState(0);
  const [aPhase, setAPhase] = useState<"answering" | "revealed">("answering");
  const [flags, setFlags] = useState<ChecklistFlags>({ has_number: false, has_consequence: false, has_right_person: false });
  const [aPoints, setAPoints] = useState<Record<string, number>>({});

  // Stage B
  const [cards, setCards] = useState<Card[]>([]);
  const [bIndex, setBIndex] = useState(0);
  const [bPhase, setBPhase] = useState<"answering" | "revealed">("answering");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [timerBIndex, setTimerBIndex] = useState(-1);
  const [bResults, setBResults] = useState<Record<string, { correct: boolean; chosen: StageBBin | null }>>({});

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("gold_checklist_items").select("*");
      if (data) setChecklistItems(shuffle(data as GoldChecklistItem[]));
    })();
  }, []);

  useEffect(() => {
    if (stage !== "stageATransition") return;
    (async () => {
      const { data } = await supabase.from("cards").select("*").in("code", STAGE_B_CODES);
      if (data) {
        const byCode = Object.fromEntries((data as Card[]).map((c) => [c.code, c]));
        setCards(shuffle(STAGE_B_CODES.map((c) => byCode[c]).filter(Boolean)));
      }
      setStage("stageB");
    })();
  }, [stage]);

  const currentChecklistItem = checklistItems[aIndex];
  const currentCard = cards[bIndex];

  // Resets the on-screen countdown the moment a new card becomes the
  // "answering" one - adjusted during render (same pattern app/play/page.tsx
  // uses for syncedRound) rather than in an effect, so the reset happens
  // before the interval effect below ever sees the new bIndex.
  if (stage === "stageB" && bPhase === "answering" && timerBIndex !== bIndex) {
    setTimerBIndex(bIndex);
    setSecondsLeft(TIME_LIMIT_SECONDS);
  }

  // Per-card countdown: runs only while Stage B is showing an unanswered
  // card. Cleared on unmount/index change so a stale timer from a previous
  // card can never fire after the player has already moved on.
  useEffect(() => {
    if (stage !== "stageB" || bPhase !== "answering" || !currentCard) return;
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
  }, [stage, bPhase, bIndex]);

  function toggleFlag(key: keyof ChecklistFlags) {
    if (aPhase !== "answering") return;
    setFlags((f) => ({ ...f, [key]: !f[key] }));
  }

  function checkChecklist() {
    const item = currentChecklistItem;
    let points = 0;
    if (flags.has_number === item.has_number) points += CHECKLIST_POINTS_PER_FLAG;
    if (flags.has_consequence === item.has_consequence) points += CHECKLIST_POINTS_PER_FLAG;
    if (flags.has_right_person === item.has_right_person) points += CHECKLIST_POINTS_PER_FLAG;
    setAPoints((prev) => ({ ...prev, [item.id]: points }));
    setAPhase("revealed");
  }

  function nextChecklistItem() {
    if (aIndex < checklistItems.length - 1) {
      setAIndex((i) => i + 1);
      setFlags({ has_number: false, has_consequence: false, has_right_person: false });
      setAPhase("answering");
    } else {
      setStage("stageATransition");
    }
  }

  function handleClassify(binKey: StageBBin | null) {
    if (bPhase !== "answering") return;
    const card = currentCard;
    const correct = binKey === correctBinFor(card.category);
    setBResults((prev) => ({ ...prev, [card.id]: { correct, chosen: binKey } }));
    setBPhase("revealed");
  }

  function nextCard() {
    if (bIndex < cards.length - 1) {
      setBIndex((i) => i + 1);
      setBPhase("answering");
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);

    const aRows = checklistItems.map((item) => {
      const points = aPoints[item.id] ?? 0;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 3,
        answer_text: item.text,
        correct: points === 3,
        points_awarded: points,
        facilitator_scored: true,
        explanation: points === 3 ? null : checklistExplanation(item),
      };
    });

    const bRows = cards.map((card) => {
      const result = bResults[card.id] ?? { correct: false, chosen: null };
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 3,
        card_id: card.id,
        placed_category: result.chosen,
        correct: result.correct,
        points_awarded: result.correct ? STAGE_B_POINTS : 0,
        facilitator_scored: true,
        explanation: card.explanation,
      };
    });

    await supabase.from("submissions").insert([...aRows, ...bRows]);
    const total = [...aRows, ...bRows].reduce((sum, r) => sum + r.points_awarded, 0);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
    setSubmitting(false);
    setStage("summary");
  }

  if (stage === "stageATransition" || (stage === "stageA" && checklistItems.length === 0)) {
    return <p className="text-text-dim">Loading the next challenge...</p>;
  }

  if (stage === "summary") {
    const aTotal = Object.values(aPoints).reduce((s, p) => s + p, 0);
    const bTotal = Object.values(bResults).filter((r) => r.correct).length * STAGE_B_POINTS;
    return (
      <div>
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">You struck {aTotal + bTotal} points</h3>
        <div className="space-y-2 mb-6">
          {checklistItems.map((item) => {
            const points = aPoints[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="ore-card-row p-4"
                style={{ borderLeft: `4px solid ${points === 3 ? "var(--gold)" : "var(--wildcard)"}` }}
              >
                <p className="text-sm mb-1">{item.text}</p>
                <p className="text-xs text-text-dim">Three Signs &middot; {points}/3 pts</p>
              </div>
            );
          })}
          {cards.map((card) => {
            const result = bResults[card.id];
            return (
              <div
                key={card.id}
                className="ore-card-row p-4"
                style={{ borderLeft: `4px solid ${result?.correct ? "var(--gold)" : "var(--wildcard)"}` }}
              >
                <p className="text-sm mb-1">{card.text}</p>
                <p className="text-xs text-text-dim">
                  {result?.chosen === null ? "Missed (out of time)" : result?.correct ? "Correct" : "Missed"} &middot;{" "}
                  {result?.correct ? STAGE_B_POINTS : 0} pts
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

  if (stage === "stageA") {
    const item = currentChecklistItem;
    return (
      <div>
        <p className="text-xs uppercase tracking-widest text-text-dim mb-2 text-center">
          Stage A &middot; Three Signs &middot; {aIndex + 1} of {checklistItems.length}
        </p>
        <p className="text-text-dim text-sm mb-6 text-center">
          Check off which of the three signs are actually present in this statement.
        </p>

        <div className="statement-card mb-6">
          <p className="text-xs uppercase tracking-widest text-text-dim mb-2">The prospect says:</p>
          <p className="text-lg leading-relaxed">{item.text}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          {(["has_number", "has_consequence", "has_right_person"] as const).map((key) => {
            const isRevealed = aPhase === "revealed";
            const isChecked = flags[key];
            const truth = item[key];
            const cls = [
              "clue-chip",
              "ore-card",
              "px-4 py-3 text-sm text-center",
              !isRevealed && isChecked ? "selected" : "",
              isRevealed && isChecked && truth ? "correct-reveal" : "",
              isRevealed && isChecked && !truth ? "wrong-reveal" : "",
              isRevealed && !isChecked && truth ? "missed-reveal" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button key={key} type="button" className={cls} disabled={isRevealed} onClick={() => toggleFlag(key)}>
                {flagLabel(key)}
              </button>
            );
          })}
        </div>

        {aPhase === "answering" && (
          <div className="text-center">
            <button className="btn btn-gold" onClick={checkChecklist}>Check my read</button>
          </div>
        )}

        {aPhase === "revealed" && (
          <div>
            <p
              className="text-center font-bold mb-4"
              style={{ color: item.is_gold ? "var(--gold)" : "var(--rock-label)" }}
            >
              {item.is_gold ? "That's Gold." : "Still Rock."}
            </p>
            <div className="ore-card-row p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">
                {item.is_gold ? "All three signs present" : "Next question to keep digging"}
              </p>
              <p className="text-sm">{item.is_gold ? "Number, consequence, and the right person all check out." : item.next_question}</p>
            </div>
            <div className="text-center">
              <button className="btn btn-gold" onClick={nextChecklistItem}>
                {aIndex < checklistItems.length - 1 ? "Next statement" : "Continue to Stage B"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // stageB
  const card = currentCard;
  if (!card) return <p className="text-text-dim">Loading cards...</p>;
  const result = bResults[card.id];
  const correctBin = correctBinFor(card.category);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-text-dim mb-2 text-center">
        Stage B &middot; Under Pressure &middot; {bIndex + 1} of {cards.length}
      </p>
      <p className="text-text-dim text-sm mb-4 text-center">
        Dirt, Rock, or Gold? Sort each one before the clock runs out.
      </p>

      {bPhase === "answering" && (
        <p
          className="text-center font-bold mb-4 stencil"
          style={{ color: secondsLeft <= 3 ? "var(--wildcard)" : "var(--text-dim)" }}
        >
          {secondsLeft}s
        </p>
      )}

      <div className="statement-card mb-6">
        <p className="text-lg leading-relaxed">{card.text}</p>
      </div>

      {bPhase === "answering" && (
        <div className="grid grid-cols-3 gap-3">
          <button className="btn btn-dirt" onClick={() => handleClassify("dirt")}>Dirt</button>
          <button className="btn btn-rock" onClick={() => handleClassify("rock")}>Rock</button>
          <button className="btn btn-gold" onClick={() => handleClassify("gold")}>Gold</button>
        </div>
      )}

      {bPhase === "revealed" && (
        <div>
          <p
            className="text-center font-bold mb-4"
            style={{ color: result?.correct ? "var(--gold)" : "var(--wildcard)" }}
          >
            {result?.chosen === null
              ? "Out of time — here's the answer."
              : result?.correct
                ? "Correct."
                : "Not quite."}
          </p>
          <div className="ore-card-row p-4 mb-3">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Correct classification</p>
            <p className="text-sm text-gold font-bold">{STAGE_B_BIN_LABEL[correctBin]}</p>
          </div>
          {card.explanation && (
            <div className="ore-card-row p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Why</p>
              <p className="text-sm">{card.explanation}</p>
            </div>
          )}
          <div className="text-center">
            <button className="btn btn-gold" disabled={submitting} onClick={nextCard}>
              {submitting ? "Locking in..." : bIndex < cards.length - 1 ? "Next card" : "See your results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
