"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Card } from "@/lib/types";
import TierSortBoard, { type SortResult } from "@/components/TierSortBoard";

const CODES = ["fg_01", "fg_02", "fg_03", "fg_04", "gold_01", "gold_02", "gold_03", "gold_04"];

const BINS = [
  { key: "gold", label: "Gold", colorVar: "gold" },
  { key: "foolsgold", label: "Fool's Gold", colorVar: "foolsgold" },
];

export default function Round4FoolsGold({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cards").select("*").in("code", CODES);
      if (data) {
        const byCode = Object.fromEntries(data.map((c) => [c.code, c]));
        const ordered = CODES.map((c) => byCode[c]).filter(Boolean);
        for (let i = ordered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        }
        setCards(ordered);
      }
    })();
  }, []);

  async function handleSubmit(results: SortResult[], total: number) {
    const rows = results.map((r) => {
      const card = cards.find((c) => c.id === r.itemId)!;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 4,
        card_id: card.id,
        placed_category: r.binKey,
        correct: r.correct,
        points_awarded: r.points,
        facilitator_scored: true,
        explanation: card.explanation,
      };
    });
    await supabase.from("submissions").insert(rows);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
  }

  if (cards.length === 0) return <p className="text-text-dim">Loading cards...</p>;

  return (
    <TierSortBoard
      items={cards.map((c) => ({ id: c.id, label: c.text, correctBin: c.category === "gold" ? "gold" : "foolsgold", points: 2, explanation: c.explanation ?? undefined }))}
      bins={BINS}
      instructions="Not everything that sounds valuable is gold. If a rep can't answer &ldquo;why does that matter?&rdquo; about a statement, it's fool's gold. Sort each one."
      onSubmit={handleSubmit}
      onContinue={onDone}
    />
  );
}
