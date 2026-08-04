"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUND_NAMES } from "@/lib/types";

interface ItemStat {
  key: string;
  text: string;
  round: number;
  total: number;
  correctCount: number;
  explanation: string | null;
}

// Raw shape of a submissions row with its embedded card - see the identical
// note in GameSummary.tsx/RoundRecap.tsx, which read the same kind of query.
interface RawInsightRow {
  round: number;
  card_id: string | null;
  answer_text: string | null;
  correct: boolean | null;
  explanation: string | null;
  cards: { text: string } | { text: string }[] | null;
}

export default function FacilitatorInsights({ sessionId }: { sessionId: string }) {
  const [stats, setStats] = useState<ItemStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("round, card_id, answer_text, correct, explanation, cards(text)")
        .eq("session_id", sessionId);

      if (data) {
        const grouped: Record<string, ItemStat> = {};
        for (const row of data as RawInsightRow[]) {
          const cardText = Array.isArray(row.cards) ? row.cards[0]?.text : row.cards?.text;
          const text = cardText ?? row.answer_text ?? "-";
          const key = `${row.round}:${row.card_id ?? row.answer_text}`;
          if (!grouped[key]) {
            grouped[key] = { key, text, round: row.round, total: 0, correctCount: 0, explanation: row.explanation };
          }
          grouped[key].total += 1;
          if (row.correct) grouped[key].correctCount += 1;
          if (!grouped[key].explanation && row.explanation) grouped[key].explanation = row.explanation;
        }
        setStats(Object.values(grouped));
      }
      setLoading(false);
    })();
  }, [sessionId]);

  if (loading) return <p className="text-text-dim text-sm">Loading insights...</p>;
  if (stats.length === 0) return <p className="text-text-dim text-sm">No submissions yet this session.</p>;

  const rounds = [1, 2, 3, 4];

  return (
    <div className="space-y-8">
      {rounds.map((r) => {
        const items = stats
          .filter((s) => s.round === r)
          .filter((s) => s.total >= 2) // skip anything only one team has touched, too small a sample to call a pattern
          .sort((a, b) => a.correctCount / a.total - b.correctCount / b.total)
          .slice(0, 5);

        if (items.length === 0) return null;

        return (
          <div key={r}>
            <h3 className="stencil text-sm text-gold mb-3">{ROUND_NAMES[r]} &middot; most missed</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const pct = Math.round((item.correctCount / item.total) * 100);
                return (
                  <div key={item.key} className="ore-card p-3" style={{ borderLeft: `4px solid ${pct < 50 ? "var(--wildcard)" : "var(--gold)"}` }}>
                    <div className="flex justify-between items-baseline gap-4">
                      <p className="text-sm flex-1">{item.text}</p>
                      <p className="text-xs text-text-dim whitespace-nowrap">{item.correctCount}/{item.total} got it ({pct}%)</p>
                    </div>
                    {item.explanation && (
                      <p className="text-xs text-text-dim mt-2 pt-2 border-t border-border italic">
                        Coaching point: {item.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
