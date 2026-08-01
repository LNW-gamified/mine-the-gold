"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MineShaftScenario, TunnelDecision, TunnelStage } from "@/lib/types";

const STAGE_ORDER: TunnelStage[] = ["dirt", "rock", "nugget"];

const BINS: { key: TunnelStage; label: string; colorVar: string }[] = [
  { key: "dirt", label: "Dirt", colorVar: "dirt" },
  { key: "rock", label: "Rock", colorVar: "rock" },
  // colorVar "nugget" (not "gold") is deliberate: this bin is the tunnel's
  // deepest layer, a subtler accent-stripe treatment, not the full gold
  // shimmer Round 3's true-Gold-vs-Fool's-Gold classification uses.
  { key: "nugget", label: "Gold", colorVar: "nugget" },
];

const PLACEMENT_POINTS: Record<TunnelStage, number> = { dirt: 3, rock: 3, nugget: 4 };
const DECISION_POINTS: Record<TunnelStage, number> = { dirt: 2, rock: 3, nugget: 4 };
const PERFECT_BONUS = 2;

// Char-sum hash of teamId to pin a team's assigned scenario across reloads,
// same technique Round1SpotSignal uses for its per-team statement picks.
function pickIndex(seed: string, count: number) {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return sum % count;
}

interface StageItem {
  stage: TunnelStage;
  label: string;
  explanation: string | null;
}

function itemsFor(scenario: MineShaftScenario): StageItem[] {
  return [
    { stage: "dirt", label: scenario.dirt_text, explanation: scenario.dirt_explanation },
    { stage: "rock", label: scenario.rock_text, explanation: scenario.rock_explanation },
    { stage: "nugget", label: scenario.nugget_text, explanation: scenario.nugget_explanation },
  ];
}

interface DecisionOption {
  text: string;
  correct: boolean;
}

export default function Round2DigToGold({
  sessionId,
  teamId,
  onDone,
}: {
  sessionId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [scenario, setScenario] = useState<MineShaftScenario | null>(null);
  const [decisions, setDecisions] = useState<Record<TunnelStage, TunnelDecision> | null>(null);

  const [phase, setPhase] = useState<"sorting" | "locking" | "reveal" | "summary">("sorting");
  const [placements, setPlacements] = useState<Record<TunnelStage, TunnelStage | null>>({
    dirt: null,
    rock: null,
    nugget: null,
  });
  const [selected, setSelected] = useState<TunnelStage | null>(null);

  const [placementResults, setPlacementResults] = useState<Record<TunnelStage, boolean>>({} as Record<TunnelStage, boolean>);
  const [decisionResults, setDecisionResults] = useState<Partial<Record<TunnelStage, boolean>>>({});
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealSub, setRevealSub] = useState<"placement" | "decision" | "decisionResult">("placement");
  const [decisionOptions, setDecisionOptions] = useState<DecisionOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: scenarios } = await supabase.from("mine_shaft_scenarios").select("*").order("title");
      if (!scenarios || scenarios.length === 0) return;
      const chosen = scenarios[pickIndex(teamId, scenarios.length)] as MineShaftScenario;
      setScenario(chosen);

      const { data: tunnelDecisions } = await supabase
        .from("tunnel_decisions")
        .select("*")
        .eq("scenario_id", chosen.id);
      if (tunnelDecisions) {
        const byStage = Object.fromEntries(
          (tunnelDecisions as TunnelDecision[]).map((d) => [d.stage, d])
        ) as Record<TunnelStage, TunnelDecision>;
        setDecisions(byStage);
      }
    })();
  }, [teamId]);

  const items = useMemo(() => (scenario ? itemsFor(scenario) : []), [scenario]);

  if (!scenario || !decisions) return <p className="text-text-dim">Loading the tunnel...</p>;

  const allPlaced = items.every((i) => placements[i.stage]);
  const trayItems = items.filter((i) => !placements[i.stage]);

  function pickUp(stage: TunnelStage) {
    setSelected(selected === stage ? null : stage);
  }

  function placeIn(binKey: TunnelStage) {
    if (!selected) return;
    setPlacements((p) => ({ ...p, [selected]: binKey }));
    setSelected(null);
  }

  function unplace(stage: TunnelStage) {
    setPlacements((p) => ({ ...p, [stage]: null }));
    setSelected(stage);
  }

  async function checkResults() {
    const results = {} as Record<TunnelStage, boolean>;
    for (const item of items) results[item.stage] = placements[item.stage] === item.stage;
    setPlacementResults(results);

    setPhase("locking");
    await new Promise((resolve) => setTimeout(resolve, 900));
    try {
      const sfx = new Audio("/sounds/success.mp3");
      sfx.volume = 0.4;
      sfx.play().catch(() => {});
    } catch {}

    setRevealIndex(0);
    setRevealSub("placement");
    setPhase("reveal");
  }

  function enterDecision(stage: TunnelStage) {
    const decision = decisions![stage];
    const options: DecisionOption[] =
      Math.random() < 0.5
        ? [
            { text: decision.correct_response, correct: true },
            { text: decision.wrong_response, correct: false },
          ]
        : [
            { text: decision.wrong_response, correct: false },
            { text: decision.correct_response, correct: true },
          ];
    setDecisionOptions(options);
    setRevealSub("decision");
  }

  function chooseDecision(stage: TunnelStage, correct: boolean) {
    setDecisionResults((prev) => ({ ...prev, [stage]: correct }));
    setRevealSub("decisionResult");
  }

  function advanceReveal() {
    if (revealIndex < STAGE_ORDER.length - 1) {
      setRevealIndex((i) => i + 1);
      setRevealSub("placement");
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    const perfect = STAGE_ORDER.every((s) => placementResults[s]);

    const rows: {
      session_id: string;
      team_id: string;
      round: number;
      answer_text: string;
      correct: boolean;
      points_awarded: number;
      facilitator_scored: boolean;
      explanation: string | null;
    }[] = [];

    for (const item of items) {
      const correct = placementResults[item.stage];
      rows.push({
        session_id: sessionId,
        team_id: teamId,
        round: 2,
        answer_text: item.label,
        correct,
        points_awarded: correct ? PLACEMENT_POINTS[item.stage] : 0,
        facilitator_scored: true,
        explanation: item.explanation,
      });

      const decisionCorrect = decisionResults[item.stage];
      if (decisionCorrect !== undefined) {
        const decision = decisions![item.stage];
        rows.push({
          session_id: sessionId,
          team_id: teamId,
          round: 2,
          answer_text: `How would you respond? “${item.label}”`,
          correct: decisionCorrect,
          points_awarded: decisionCorrect ? DECISION_POINTS[item.stage] : 0,
          facilitator_scored: true,
          explanation: decisionCorrect ? null : decisionExplanation(item.stage, decision),
        });
      }
    }

    if (perfect) {
      rows.push({
        session_id: sessionId,
        team_id: teamId,
        round: 2,
        answer_text: "Perfect tunnel — all three layers placed correctly.",
        correct: true,
        points_awarded: PERFECT_BONUS,
        facilitator_scored: true,
        explanation: null,
      });
    }

    await supabase.from("submissions").insert(rows);
    const total = rows.reduce((sum, r) => sum + r.points_awarded, 0);
    if (total > 0) await supabase.rpc("add_team_points", { p_team_id: teamId, p_delta: total });
    setSubmitting(false);
    setPhase("summary");
  }

  if (phase === "summary") {
    const perfect = STAGE_ORDER.every((s) => placementResults[s]);
    const placementTotal = STAGE_ORDER.reduce(
      (sum, s) => sum + (placementResults[s] ? PLACEMENT_POINTS[s] : 0),
      0
    );
    const decisionTotal = STAGE_ORDER.reduce(
      (sum, s) => sum + (decisionResults[s] ? DECISION_POINTS[s] : 0),
      0
    );
    const total = placementTotal + decisionTotal + (perfect ? PERFECT_BONUS : 0);

    return (
      <div>
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">You struck {total} points</h3>
        <div className="space-y-2 mb-6">
          {items.map((item) => {
            const correct = placementResults[item.stage];
            const decisionCorrect = decisionResults[item.stage];
            return (
              <div
                key={item.stage}
                className="ore-card-row p-4"
                style={{
                  borderLeft: `4px solid ${correct ? "var(--gold)" : "var(--wildcard)"}`,
                  background: correct ? "color-mix(in srgb, var(--gold) 8%, var(--surface-raised))" : undefined,
                }}
              >
                <p className="text-sm mb-1">{item.label}</p>
                <p className="text-xs text-text-dim">
                  {correct ? "Placed correctly" : "Misplaced"} &middot; {correct ? PLACEMENT_POINTS[item.stage] : 0} pts
                  {decisionCorrect !== undefined && (
                    <> &middot; response {decisionCorrect ? "correct" : "missed"} &middot; {decisionCorrect ? DECISION_POINTS[item.stage] : 0} pts</>
                  )}
                </p>
              </div>
            );
          })}
          {perfect && (
            <div className="ore-card-row p-4" style={{ borderLeft: "4px solid var(--nugget)" }}>
              <p className="text-sm">Perfect tunnel bonus</p>
              <p className="text-xs text-text-dim">+{PERFECT_BONUS} pts</p>
            </div>
          )}
        </div>
        <div className="text-center">
          <button className="btn btn-gold" onClick={onDone}>Continue digging</button>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const stage = STAGE_ORDER[revealIndex];
    const item = items.find((i) => i.stage === stage)!;
    const correct = placementResults[stage];
    const decision = decisions[stage];

    if (revealSub === "placement") {
      return (
        <div>
          <p className="text-xs uppercase tracking-widest text-text-dim mb-4 text-center">
            Layer {revealIndex + 1} of {STAGE_ORDER.length}
          </p>
          <div className="ore-card-row p-4 mb-4">
            <p className="text-sm mb-1">{item.label}</p>
          </div>
          <p
            className="text-center font-bold mb-4"
            style={{ color: correct ? "var(--gold)" : "var(--wildcard)" }}
          >
            {correct ? "Placed correctly." : "That belongs in a different layer."}
          </p>
          {!correct && item.explanation && (
            <div className="ore-card-row p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Why</p>
              <p className="text-sm">{item.explanation}</p>
            </div>
          )}
          <div className="text-center">
            <button
              className="btn btn-gold"
              onClick={() => (correct ? enterDecision(stage) : advanceReveal())}
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (revealSub === "decision") {
      return (
        <div>
          <p className="text-text-dim text-sm mb-6 text-center">
            {stage === "nugget"
              ? "You've hit gold. What do you say next?"
              : "What's the best thing to say next?"}
          </p>
          <div className="ore-card-row p-4 mb-6">
            <p className="text-sm">{item.label}</p>
          </div>
          <div className="space-y-3">
            {decisionOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="ore-card w-full text-left p-4 text-sm"
                onClick={() => chooseDecision(stage, opt.correct)}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // decisionResult
    const decisionCorrect = decisionResults[stage]!;
    return (
      <div>
        <p
          className="text-center font-bold mb-4"
          style={{ color: decisionCorrect ? "var(--gold)" : "var(--wildcard)" }}
        >
          {decisionCorrect ? "That's the right move." : "Not quite the right move."}
        </p>
        <div className="ore-card-row p-4 mb-3">
          <p className="text-xs uppercase tracking-widest text-text-dim mb-1">
            {stage === "nugget" ? "The bridge" : "Keep digging"}
          </p>
          <p className="text-sm">{decision.correct_response}</p>
        </div>
        {!decisionCorrect && (
          <div className="ore-card-row p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-text-dim mb-1">Why</p>
            <p className="text-sm">{decisionExplanation(stage, decision)}</p>
          </div>
        )}
        <div className="text-center">
          <button className="btn btn-gold" onClick={advanceReveal}>
            {revealIndex < STAGE_ORDER.length - 1 ? "Next layer" : "See your results"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-text-dim text-sm mb-6">
        Three statements from the same customer story, shuffled. Rebuild the tunnel: place them in the order a
        skilled rep would uncover them, from the first thing a prospect mentions down to the real economic impact.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {BINS.map((bin) => {
          const placedStage = (Object.keys(placements) as TunnelStage[]).find((s) => placements[s] === bin.key);
          const placedItem = placedStage ? items.find((i) => i.stage === placedStage) : undefined;
          return (
            <button
              key={bin.key}
              onClick={() => placeIn(bin.key)}
              className={`bin bin-${bin.colorVar} p-3 min-h-[140px] text-left ${selected ? "active" : ""}`}
              style={{ ["--bin-color" as string]: `var(--${bin.colorVar})` }}
            >
              <p className="stencil text-xs mb-2">{bin.label}</p>
              {placedItem ? (
                <div
                  onClick={(e) => { e.stopPropagation(); unplace(placedItem.stage); }}
                  className="ore-card text-xs px-2 py-1"
                >
                  {placedItem.label}
                </div>
              ) : (
                <div className="add-target" aria-label={`Add to ${bin.label}`}>+</div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-text-dim text-xs mb-2">
        {selected ? "Now tap the layer it belongs in." : "Tap a statement, then tap the layer it belongs in."}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {trayItems.map((item) => (
          <button
            key={item.stage}
            onClick={() => pickUp(item.stage)}
            className={`ore-card px-4 py-3 text-sm text-left max-w-xs ${selected === item.stage ? "selected" : ""}`}
          >
            {item.label}
          </button>
        ))}
        {trayItems.length === 0 && <p className="text-text-dim text-sm">All placed. Ready to check your work.</p>}
      </div>

      <div className="text-center">
        <button
          className="btn btn-gold"
          disabled={!allPlaced || submitting || phase === "locking"}
          onClick={checkResults}
        >
          {phase === "locking" ? "Locking in..." : "Check results"}
        </button>
      </div>
    </div>
  );
}

// Round-specific flip: at Dirt/Rock, the wrong move is pitching too early.
// At Gold, the wrong move is the opposite - digging *past* the moment
// you've already earned the pitch. Same "wrong_response" column, different
// reason depending on stage, so the explanation has to name it explicitly.
function decisionExplanation(stage: TunnelStage, decision: TunnelDecision): string {
  if (stage === "nugget") {
    return "You'd already earned the pitch here — more digging just wastes the moment.";
  }
  return `Pitching here is premature — the stronger move is: “${decision.correct_response}”`;
}
