"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MineShaftScenario } from "@/lib/types";
import TierSortBoard, { type SortResult } from "@/components/TierSortBoard";

const BINS = [
  { key: "p1", label: "1. Surface", colorVar: "dirt" },
  { key: "p2", label: "2. Problem", colorVar: "rock" },
  { key: "p3", label: "3. Impact", colorVar: "nugget" },
];

function pickScenario(teamId: string, count: number) {
  let sum = 0;
  for (const ch of teamId) sum += ch.charCodeAt(0);
  return sum % count;
}

export default function Round2Tunnel({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [scenario, setScenario] = useState<MineShaftScenario | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mine_shaft_scenarios").select("*").order("title");
      if (data && data.length > 0) {
        setScenario(data[pickScenario(teamId, data.length)]);
      }
    })();
  }, [teamId]);

  if (!scenario) return <p className="text-text-dim">Loading tunnel...</p>;

  const items = [
    { id: "dirt", label: scenario.dirt_text, correctBin: "p1", points: 3, explanation: scenario.dirt_explanation ?? undefined },
    { id: "rock", label: scenario.rock_text, correctBin: "p2", points: 3, explanation: scenario.rock_explanation ?? undefined },
    { id: "nugget", label: scenario.nugget_text, correctBin: "p3", points: 4, explanation: scenario.nugget_explanation ?? undefined },
  ];

  async function handleSubmit(results: SortResult[], total: number) {
    const perfect = results.every((r) => r.correct);
    const bonus = perfect ? 2 : 0;
    const rows = results.map((r) => {
      const item = items.find((i) => i.id === r.itemId)!;
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 3,
        answer_text: item.label,
        correct: r.correct,
        points_awarded: r.points,
        facilitator_scored: true,
        explanation: item.explanation ?? null,
      };
    });
    await supabase.from("submissions").insert(rows);
    const finalTotal = total + bonus;
    if (finalTotal > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: finalTotal });
  }

  return (
    <TierSortBoard
      items={items}
      bins={BINS}
      instructions="Three statements from the same customer story, shuffled. Rebuild the tunnel: place them in the order a skilled rep would uncover them, from the first thing a prospect mentions down to the real economic impact."
      onSubmit={handleSubmit}
      onContinue={onDone}
    />
  );
}
