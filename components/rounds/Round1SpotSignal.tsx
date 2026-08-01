"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SignalStatement } from "@/lib/types";
import { SIGNAL_TYPE_LABELS } from "@/lib/types";

const FULL_POINTS = 2;

// Char-sum hash of teamId (+ a type tag) so each team's assigned content
// stays pinned across reloads instead of re-randomizing on every render.
function pickIndex(seed: string, count: number) {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return sum % count;
}

// Deterministic per-team shuffle so the 7 chosen statements' order is
// stable across reloads too, not just which statement was chosen per type.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Plain (non-seeded) shuffle for answer-option order - unlike the
// statement order above, this should genuinely randomize every
// playthrough, not stay pinned per team, so position alone never becomes
// a learnable tell.
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Round1SpotSignal({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [statements, setStatements] = useState<SignalStatement[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"answering" | "revealed" | "summary">("answering");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pointsByStatement, setPointsByStatement] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("signal_statements").select("*");
      if (!data || data.length === 0) return;
      const byType = new Map<string, SignalStatement[]>();
      for (const s of data as SignalStatement[]) {
        if (!byType.has(s.signal_type)) byType.set(s.signal_type, []);
        byType.get(s.signal_type)!.push(s);
      }
      const chosen: SignalStatement[] = [];
      for (const [type, group] of byType) {
        chosen.push(group[pickIndex(teamId + type, group.length)]);
      }
      setStatements(seededShuffle(chosen, teamId));
    })();
  }, [teamId]);

  const current = statements[index];
  const options = useMemo(
    () => (current ? shuffle([current.correct_answer, ...current.distractor_options]) : []),
    [current]
  );

  if (statements.length === 0) return <p className="text-text-dim">Loading the next statement...</p>;

  function choose(option: string) {
    if (phase !== "answering") return;
    const correct = option === current.correct_answer;
    setSelectedOption(option);
    setPointsByStatement((prev) => ({ ...prev, [current.id]: correct ? FULL_POINTS : 0 }));
    setPhase("revealed");
  }

  function next() {
    if (index < statements.length - 1) {
      setIndex((i) => i + 1);
      setSelectedOption(null);
      setPhase("answering");
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    const rows = statements.map((s) => {
      const points = pointsByStatement[s.id] ?? 0;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 1,
        answer_text: s.text,
        correct: points === FULL_POINTS,
        points_awarded: points,
        facilitator_scored: true,
        explanation: s.explanation,
      };
    });
    await supabase.from("submissions").insert(rows);
    const total = rows.reduce((sum, r) => sum + r.points_awarded, 0);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
    setSubmitting(false);
    setPhase("summary");
  }

  if (phase === "summary") {
    const total = statements.reduce((sum, s) => sum + (pointsByStatement[s.id] ?? 0), 0);
    return (
      <div>
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">You struck {total} points</h3>
        <div className="space-y-2 mb-6">
          {statements.map((s) => {
            const points = pointsByStatement[s.id] ?? 0;
            const correct = points === FULL_POINTS;
            return (
              <div
                key={s.id}
                className="ore-card-row p-4"
                style={{
                  borderLeft: `4px solid ${correct ? "var(--gold)" : "var(--wildcard)"}`,
                  background: correct ? "color-mix(in srgb, var(--gold) 8%, var(--surface-raised))" : undefined,
                }}
              >
                <p className="text-sm mb-1">{s.text}</p>
                <p className="text-xs text-text-dim">
                  {SIGNAL_TYPE_LABELS[s.signal_type]} &middot; {points} pts
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

  const correct = selectedOption === current.correct_answer;

  return (
    <div>
      <p className="text-text-dim text-sm mb-2">
        Statement {index + 1} of {statements.length}
      </p>
      <p className="text-text-dim text-sm mb-6">
        A prospect just said something. Which part is the real clue &mdash; the part worth digging into?
      </p>

      <div className="statement-card mb-6">
        <p className="text-xs uppercase tracking-widest text-text-dim mb-2">The prospect says:</p>
        <p className="text-lg leading-relaxed">{current.text}</p>
      </div>

      {phase === "answering" && (
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="ore-card w-full text-left p-4 text-sm"
              onClick={() => choose(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <p
            className="text-center font-bold mb-4"
            style={{ color: correct ? "var(--gold)" : "var(--wildcard)" }}
          >
            {correct ? "Found it — that's the clue." : "Not quite — here's the real clue."}
          </p>
          {!correct && (
            <div className="ore-card-row p-4 mb-3">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">The real clue</p>
              <p className="text-sm">{current.correct_answer}</p>
            </div>
          )}
          <div className="ore-card-row p-4 mb-3">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Signal type</p>
            <p className="text-sm text-gold font-bold">{SIGNAL_TYPE_LABELS[current.signal_type]}</p>
          </div>
          <div className="ore-card-row p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Ask this to keep digging</p>
            <p className="text-sm">{current.ask_question}</p>
          </div>
          <div className="text-center">
            <button className="btn btn-gold" disabled={submitting} onClick={next}>
              {submitting ? "Locking in..." : index < statements.length - 1 ? "Next statement" : "See your results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
