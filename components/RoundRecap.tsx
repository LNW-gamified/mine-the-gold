"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUND_NAMES } from "@/lib/types";

interface RecapRow {
  id: string;
  answer_text: string | null;
  correct: boolean | null;
  points_awarded: number;
  explanation: string | null;
  card_text: string | null;
}

// Raw shape of a submissions row with its embedded card - see the identical
// note in GameSummary.tsx, which reads the same kind of query result.
interface RawSubmissionRow {
  id: string;
  answer_text: string | null;
  correct: boolean | null;
  points_awarded: number;
  explanation: string | null;
  cards: { text: string } | { text: string }[] | null;
}

export default function RoundRecap({ teamId, round }: { teamId: string; round: number }) {
  const [rows, setRows] = useState<RecapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("submissions")
        .select("id, answer_text, correct, points_awarded, explanation, cards(text)")
        .eq("team_id", teamId)
        .eq("round", round)
        .order("created_at", { ascending: true });

      if (data) {
        setRows(
          (data as RawSubmissionRow[]).map((d) => ({
            id: d.id,
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
  }, [teamId, round]);

  const total = rows.reduce((s, r) => s + r.points_awarded, 0);
  const correctCount = rows.filter((r) => r.correct).length;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-nugget mb-2 stencil">{ROUND_NAMES[round]} &middot; already dug</h2>
        {!loading && rows.length > 0 && (
          <p className="text-text-dim text-sm">
            {correctCount}/{rows.length} correct &middot; <span className="text-gold font-bold">{total}</span> points earned
          </p>
        )}
        <p className="text-text-dim text-xs mt-2 italic">This round is locked in. You can review it, but not change your answers.</p>
      </div>

      {loading && <p className="text-text-dim text-sm text-center">Loading...</p>}

      <div className="space-y-2">
        {rows.map((row) => (
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
}
