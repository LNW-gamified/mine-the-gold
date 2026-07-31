"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Card, DigDeeperPrompt } from "@/lib/types";
import TierSortBoard, { type SortResult } from "@/components/TierSortBoard";

const BINS = [
  { key: "level2", label: "Level 1 question", colorVar: "rock" },
  { key: "level3", label: "Level 2 question", colorVar: "gold" },
  { key: "impact", label: "Level 3 question", colorVar: "nugget" },
];

function pickIndex(teamId: string, count: number) {
  let sum = 0;
  for (const ch of teamId) sum += ch.charCodeAt(0);
  return sum % count;
}

export default function Round3DigDeeper({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [dirtCard, setDirtCard] = useState<Card | null>(null);
  const [prompts, setPrompts] = useState<DigDeeperPrompt[]>([]);

  useEffect(() => {
    (async () => {
      const { data: dirtCards } = await supabase.from("cards").select("*").eq("category", "dirt").order("code");
      if (!dirtCards || dirtCards.length === 0) return;
      const chosen = dirtCards[pickIndex(teamId, dirtCards.length)];
      setDirtCard(chosen);
      const { data: p } = await supabase.from("dig_deeper_prompts").select("*").eq("dirt_card_id", chosen.id);
      if (p) setPrompts(p);
    })();
  }, [teamId]);

  if (!dirtCard || prompts.length === 0) return <p className="text-text-dim">Loading the next statement...</p>;

  async function handleSubmit(results: SortResult[], total: number) {
    const rows = results.map((r) => {
      const prompt = prompts.find((p) => p.id === r.itemId)!;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 3,
        card_id: dirtCard!.id,
        answer_text: prompt.question_text,
        correct: r.correct,
        points_awarded: r.points,
        facilitator_scored: true,
        explanation: prompt.explanation,
      };
    });
    await supabase.from("submissions").insert(rows);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
  }

  return (
    <div>
      <p className="text-text-dim text-sm mb-2">The prospect just said:</p>
      <div className="ore-card p-6 mb-6 text-center">
        <p className="text-xl">&ldquo;{dirtCard.text}&rdquo;</p>
      </div>
      <TierSortBoard
        items={prompts.map((p) => ({ id: p.id, label: p.question_text, correctBin: p.tier, points: p.points, explanation: p.explanation ?? undefined }))}
        bins={BINS}
        instructions="Three follow-up questions a rep might ask next. Sort them by how deep each one actually goes."
        onSubmit={handleSubmit}
        onContinue={onDone}
      />
    </div>
  );
}
