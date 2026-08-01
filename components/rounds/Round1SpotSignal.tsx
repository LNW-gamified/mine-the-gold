"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SignalStatement } from "@/lib/types";
import { SIGNAL_TYPE_LABELS } from "@/lib/types";

const FULL_POINTS = 2;
const PARTIAL_POINTS = 1;

interface Chunk {
  key: string;
  text: string;
  clickable: boolean;
  isClue: boolean;
}

// Splits a non-clue segment into individual word-level tap targets, not
// whole clauses: clue_phrases are now short (1-3 word) fragments rather
// than full clauses, so a distractor chunk spanning an entire clause would
// dwarf the clue chunks it's competing with and give away the answer by
// size alone. Clause-break punctuation is still peeled off into its own
// non-clickable chunk (spot_the_clue_mockup.html's plain "." / "," chips)
// rather than glued onto the word before it.
function tokenizePlain(segment: string, keyPrefix: string): Chunk[] {
  const pieces = segment.split(/([,;:—–]|\.(?=\s|$))/);
  const chunks: Chunk[] = [];
  let i = 0;
  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    if (/^[,;:—–.]$/.test(trimmed)) {
      chunks.push({ key: `${keyPrefix}-${i++}`, text: trimmed, clickable: false, isClue: false });
      continue;
    }
    for (const word of trimmed.split(/\s+/)) {
      chunks.push({ key: `${keyPrefix}-${i++}`, text: word, clickable: true, isClue: false });
    }
  }
  return chunks;
}

// Locates each clue phrase as an exact substring of the statement and walks
// the text left to right, turning the surrounding prose into tap-able
// distractor chunks and each clue phrase into its own single chunk.
function chunkStatement(text: string, cluePhrases: string[]): Chunk[] {
  const occurrences = cluePhrases
    .map((phrase) => ({ phrase, start: text.indexOf(phrase) }))
    .filter((o) => o.start !== -1)
    .sort((a, b) => a.start - b.start);

  const chunks: Chunk[] = [];
  let cursor = 0;
  occurrences.forEach((occ, i) => {
    chunks.push(...tokenizePlain(text.slice(cursor, occ.start), `pre${i}`));
    chunks.push({ key: `clue${i}`, text: occ.phrase, clickable: true, isClue: true });
    cursor = occ.start + occ.phrase.length;
  });
  chunks.push(...tokenizePlain(text.slice(cursor), "post"));
  return chunks;
}

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

type Verdict = "full" | "partial" | "miss";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"answering" | "revealed" | "summary">("answering");
  const [verdict, setVerdict] = useState<Verdict>("miss");
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
  const chunks = useMemo(() => (current ? chunkStatement(current.text, current.clue_phrases) : []), [current]);

  if (statements.length === 0) return <p className="text-text-dim">Loading the next statement...</p>;

  function toggle(key: string) {
    if (phase !== "answering") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function check() {
    const clueKeys = new Set(chunks.filter((c) => c.isClue).map((c) => c.key));
    const allCorrectFound = [...clueKeys].every((k) => selected.has(k));
    const noWrongPicks = [...selected].every((k) => clueKeys.has(k));
    const anyCorrectSelected = [...selected].some((k) => clueKeys.has(k));

    let v: Verdict;
    let points: number;
    if (allCorrectFound && noWrongPicks) {
      v = "full";
      points = FULL_POINTS;
    } else if (allCorrectFound || anyCorrectSelected) {
      v = "partial";
      points = PARTIAL_POINTS;
    } else {
      v = "miss";
      points = 0;
    }

    setPointsByStatement((prev) => ({ ...prev, [current.id]: points }));
    setVerdict(v);
    setPhase("revealed");
  }

  function next() {
    if (index < statements.length - 1) {
      setIndex((i) => i + 1);
      setSelected(new Set());
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

  return (
    <div>
      <p className="text-text-dim text-sm mb-2">
        Statement {index + 1} of {statements.length}
      </p>
      <p className="text-text-dim text-sm mb-6">
        A prospect just said something. Tap the word or phrase that&rsquo;s the real clue &mdash; the part worth
        digging into.
      </p>

      <div className="statement-card mb-6">
        <p className="text-xs uppercase tracking-widest text-text-dim mb-2">The prospect says:</p>
        <p className="text-lg leading-relaxed">
          {chunks.map((c, i) => {
            // No leading space on the first chunk or before a punctuation
            // chunk (it attaches directly to the word before it); every
            // other chunk gets one, so words read with normal spacing.
            const display = i === 0 || !c.clickable ? c.text : ` ${c.text}`;
            if (!c.clickable) {
              return (
                <span key={c.key} className="clue-chip plain">
                  {display}
                </span>
              );
            }
            const isRevealed = phase === "revealed";
            const isSelected = selected.has(c.key);
            const cls = [
              "clue-chip",
              !isRevealed && isSelected ? "selected" : "",
              isRevealed && c.isClue ? "correct-reveal" : "",
              isRevealed && !c.isClue && isSelected ? "wrong-reveal" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button key={c.key} type="button" className={cls} disabled={isRevealed} onClick={() => toggle(c.key)}>
                {display}
              </button>
            );
          })}
        </p>
      </div>

      {phase === "answering" && (
        <div className="text-center">
          <button className="btn btn-gold" disabled={selected.size === 0} onClick={check}>
            Check my read
          </button>
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <p
            className="text-center font-bold mb-4"
            style={{
              color: verdict === "full" ? "var(--gold)" : verdict === "partial" ? "var(--nugget)" : "var(--wildcard)",
            }}
          >
            {verdict === "full" && "Found it — that's the clue."}
            {verdict === "partial" && "Partly there — see what you missed above."}
            {verdict === "miss" && "Not quite — here's the real clue."}
          </p>
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
