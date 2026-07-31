"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUND_NAMES } from "@/lib/types";

interface SummaryRow {
  id: string;
  round: number;
  answer_text: string | null;
  correct: boolean | null;
  points_awarded: number;
  explanation: string | null;
  card_text: string | null;
}

// Raw shape of a submissions row with its embedded card, as returned by the
// select() below. Supabase's embedded-resource typing varies between a
// single object and an array depending on the inferred relationship
// cardinality, so both are accepted here.
interface RawSubmissionRow {
  id: string;
  round: number;
  answer_text: string | null;
  correct: boolean | null;
  points_awarded: number;
  explanation: string | null;
  cards: { text: string } | { text: string }[] | null;
}

export default function GameSummary({ teamId, finalScore }: { teamId: string; finalScore: number }) {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, round, answer_text, correct, points_awarded, explanation, cards(text)")
        .eq("team_id", teamId)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true });

      if (data) {
        setRows(
          (data as RawSubmissionRow[]).map((d) => ({
            id: d.id,
            round: d.round,
            answer_text: d.answer_text,
            correct: d.correct,
            points_awarded: d.points_awarded,
            explanation: d.explanation,
            card_text: Array.isArray(d.cards) ? (d.cards[0]?.text ?? null) : (d.cards?.text ?? null),
          }))
        );
      }
      setLoading(false);
    })();
  }, [teamId]);

  const rounds = [1, 2, 3, 4];
  const correctCount = rows.filter((r) => r.correct).length;
  const totalCount = rows.length;

  return (
    <div className="text-center py-8">
      <h2 className="text-3xl font-bold text-nugget mb-2 stencil">The dig is done</h2>
      <p className="text-text-dim mb-1">Final score: <span className="text-gold font-bold">{finalScore}</span> points</p>
      {totalCount > 0 && (
        <p className="text-text-dim text-sm mb-8">{correctCount} of {totalCount} placed correctly</p>
      )}

      {loading && <p className="text-text-dim text-sm">Loading your run...</p>}

      {!loading && rows.length === 0 && (
        <p className="text-text-dim text-sm">No recorded rounds for this team yet.</p>
      )}

      <div className="text-left max-w-2xl mx-auto space-y-8">
        {rounds.map((r) => {
          const roundRows = rows.filter((row) => row.round === r);
          if (roundRows.length === 0) return null;
          const roundCorrect = roundRows.filter((row) => row.correct).length;
          return (
            <div key={r}>
              <div className="flex justify-between items-baseline mb-3 border-b border-border pb-2">
                <h3 className="stencil text-sm text-gold">{ROUND_NAMES[r]}</h3>
                <span className="text-xs text-text-dim">{roundCorrect}/{roundRows.length} correct</span>
              </div>
              <div className="space-y-2">
                {roundRows.map((row) => (
                  <div
                    key={row.id}
                    className="ore-card p-3"
                    style={{ borderLeft: `4px solid ${row.correct ? "var(--gold)" : "var(--wildcard)"}` }}
                  >
                    <p className="text-sm">{row.answer_text ?? row.card_text ?? "—"}</p>
                    <p className="text-xs text-text-dim mt-1">
                      {row.correct ? "Correct" : "Missed"} &middot; {row.points_awarded} pts
                    </p>
                    {!row.correct && row.explanation && (
                      <p className="text-xs text-text-dim mt-2 pt-2 border-t border-border italic">
                        Why: {row.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
