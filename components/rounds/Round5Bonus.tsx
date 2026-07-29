"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BONUS_TRANSCRIPTS } from "@/lib/transcripts";
import TierSortBoard, { type SortResult } from "@/components/TierSortBoard";

const BINS = [
  { key: "dirt", label: "Dirt", colorVar: "dirt" },
  { key: "rock", label: "Rock", colorVar: "rock" },
  { key: "gold", label: "Gold", colorVar: "gold" },
  { key: "gold_nugget", label: "Gold Nugget", colorVar: "nugget" },
];

function pickIndex(teamId: string, count: number) {
  let sum = 0;
  for (const ch of teamId) sum += ch.charCodeAt(0) * 3;
  return sum % count;
}

export default function Round5Bonus({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const transcript = BONUS_TRANSCRIPTS[pickIndex(teamId, BONUS_TRANSCRIPTS.length)];
  const [phase, setPhase] = useState<"sort" | "mcq" | "done">("sort");
  const [sortPoints, setSortPoints] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [mcqPoints, setMcqPoints] = useState<number | null>(null);

  const items = transcript.lines.map((l, i) => ({
    id: `line${i}`,
    label: l.text,
    correctBin: l.tier === "gold_nugget" ? "gold_nugget" : l.tier,
    points: l.points,
  }));

  async function handleSortSubmit(results: SortResult[], total: number) {
    const rows = results.map((r) => {
      const idx = Number(r.itemId.replace("line", ""));
      return {
        session_id: sessionId,
        team_id: teamId,
        round: 5,
        answer_text: JSON.stringify({ transcript: transcript.label, line: transcript.lines[idx].text, placed: r.binKey }),
        correct: r.correct,
        points_awarded: r.points,
        facilitator_scored: true,
      };
    });
    await supabase.from("submissions").insert(rows);
    setSortPoints(total);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
  }

  async function submitMcq() {
    if (pickedOption === null) return;
    const option = transcript.followUps[pickedOption];
    const points = option.correct ? 5 : 0;
    await supabase.from("submissions").insert({
      session_id: sessionId,
      team_id: teamId,
      round: 5,
      answer_text: option.text,
      correct: option.correct,
      points_awarded: points,
      facilitator_scored: true,
    });
    if (points > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: points });
    setMcqPoints(points);
    setPhase("done");
  }

  if (phase === "sort") {
    return (
      <div>
        <p className="text-text-dim text-sm mb-2">Discovery call transcript:</p>
        <div className="ore-card p-4 mb-6 space-y-2">
          {transcript.lines.map((l, i) => (
            <p key={i} className="text-sm">&ldquo;{l.text}&rdquo;</p>
          ))}
        </div>
        <TierSortBoard
          items={items}
          bins={BINS}
          instructions="Sort each line the prospect said into its true layer."
          onSubmit={handleSortSubmit}
          onContinue={() => setPhase("mcq")}
        />
      </div>
    );
  }

  if (phase === "mcq") {
    return (
      <div>
        <p className="text-text-dim text-sm mb-4">
          Layers sorted, {sortPoints} points banked. One more thing: which question would actually move this deal forward?
        </p>
        <div className="space-y-3 mb-6">
          {transcript.followUps.map((opt, i) => (
            <button
              key={i}
              onClick={() => setPickedOption(i)}
              className="ore-card p-4 text-left w-full"
              style={{ outline: pickedOption === i ? "2px solid var(--gold)" : "none", outlineOffset: "2px" }}
            >
              {opt.text}
            </button>
          ))}
        </div>
        <div className="text-center">
          <button className="btn btn-gold" disabled={pickedOption === null} onClick={submitMcq}>
            Lock it in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-nugget mb-2">Strike It Rich complete</h2>
      <p className="text-text-dim mb-6">{sortPoints + (mcqPoints ?? 0)} points from this round.</p>
      <button className="btn btn-gold" onClick={onDone}>Continue</button>
    </div>
  );
}
