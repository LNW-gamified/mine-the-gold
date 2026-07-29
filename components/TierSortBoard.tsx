"use client";

import { useState } from "react";

export interface SortItem {
  id: string;
  label: string;
  correctBin: string;
  points: number;
}

export interface SortBin {
  key: string;
  label: string;
  colorVar: string; // e.g. "dirt", "rock", "gold", "nugget", "foolsgold"
}

export interface SortResult {
  itemId: string;
  binKey: string;
  correct: boolean;
  points: number;
}

export default function TierSortBoard({
  items,
  bins,
  instructions,
  onSubmit,
  onContinue,
  layout = "grid",
}: {
  items: SortItem[];
  bins: SortBin[];
  instructions?: string;
  onSubmit: (results: SortResult[], total: number) => Promise<void> | void;
  onContinue: () => void;
  layout?: "grid" | "stack";
}) {
  const [placements, setPlacements] = useState<Record<string, string | null>>(
    Object.fromEntries(items.map((i) => [i.id, null]))
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<"sorting" | "revealed">("sorting");
  const [results, setResults] = useState<SortResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const allPlaced = items.every((i) => placements[i.id]);

  function labelColor(colorVar: string) {
    return colorVar === "rock" ? "var(--rock-label)" : `var(--${colorVar})`;
  }

  function placeIn(binKey: string) {
    if (!selected) return;
    setPlacements((p) => ({ ...p, [selected]: binKey }));
    setSelected(null);
  }

  function pickUp(itemId: string) {
    setSelected(selected === itemId ? null : itemId);
  }

  function unplace(itemId: string) {
    setPlacements((p) => ({ ...p, [itemId]: null }));
    setSelected(itemId);
  }

  async function checkResults() {
    setSubmitting(true);
    const computed: SortResult[] = items.map((item) => {
      const binKey = placements[item.id]!;
      const correct = binKey === item.correctBin;
      return { itemId: item.id, binKey, correct, points: correct ? item.points : 0 };
    });
    const total = computed.reduce((s, r) => s + r.points, 0);
    await onSubmit(computed, total);
    setResults(computed);
    setPhase("revealed");
    setSubmitting(false);
  }

  if (phase === "revealed") {
    const total = results.reduce((s, r) => s + r.points, 0);
    return (
      <div>
        <h3 className="text-xl font-bold text-nugget mb-4 text-center">
          You struck {total} points
        </h3>
        <div className="space-y-2 mb-6">
          {items.map((item) => {
            const r = results.find((res) => res.itemId === item.id)!;
            const bin = bins.find((b) => b.key === r.binKey);
            const correctBin = bins.find((b) => b.key === item.correctBin);
            return (
              <div
                key={item.id}
                className="ore-card p-4"
                style={{ borderLeft: `4px solid ${r.correct ? "var(--gold)" : "var(--wildcard)"}` }}
              >
                <p className="text-sm mb-1">{item.label}</p>
                <p className="text-xs text-text-dim">
                  You placed: <span className="text-text">{bin?.label}</span>
                  {!r.correct && correctBin && (
                    <> &middot; Correct layer: <span className="text-gold">{correctBin.label}</span></>
                  )}
                  {" "}&middot; {r.points} pts
                </p>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <button className="btn btn-gold" onClick={onContinue}>Continue digging</button>
        </div>
      </div>
    );
  }

  const trayItems = items.filter((i) => !placements[i.id]);

  return (
    <div>
      {instructions && <p className="text-text-dim text-sm mb-6">{instructions}</p>}

      {layout === "stack" ? (
        <div className="flex flex-col gap-3 mb-6">
          {bins.map((bin) => {
            const placed = items.filter((i) => placements[i.id] === bin.key);
            return (
              <button
                key={bin.key}
                onClick={() => placeIn(bin.key)}
                className={`bin bin-${bin.colorVar} p-3 min-h-[64px] w-full flex items-center gap-3 text-left ${selected ? "active" : ""}`}
                style={{ ["--bin-color" as string]: `var(--${bin.colorVar})` }}
              >
                <p className="stencil text-xs shrink-0" style={{ color: labelColor(bin.colorVar) }}>{bin.label}</p>
                <div className="flex flex-wrap gap-1 justify-end flex-1">
                  {placed.map((i) => (
                    <div
                      key={i.id}
                      onClick={(e) => { e.stopPropagation(); unplace(i.id); }}
                      className="text-xs bg-surface rounded px-2 py-1 border border-border"
                    >
                      {i.label}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={`grid gap-3 mb-6`} style={{ gridTemplateColumns: `repeat(${Math.min(bins.length, 4)}, minmax(0, 1fr))` }}>
          {bins.map((bin) => {
            const placed = items.filter((i) => placements[i.id] === bin.key);
            return (
              <button
                key={bin.key}
                onClick={() => placeIn(bin.key)}
                className={`bin bin-${bin.colorVar} p-3 min-h-[140px] text-left ${selected ? "active" : ""}`}
                style={{ ["--bin-color" as string]: `var(--${bin.colorVar})` }}
              >
                <p className="stencil text-xs mb-2" style={{ color: labelColor(bin.colorVar) }}>{bin.label}</p>
                <div className="space-y-1">
                  {placed.map((i) => (
                    <div
                      key={i.id}
                      onClick={(e) => { e.stopPropagation(); unplace(i.id); }}
                      className="text-xs bg-surface rounded px-2 py-1 border border-border"
                    >
                      {i.label}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-text-dim text-xs mb-2">
        {selected ? "Now tap a layer above to place it." : "Tap a statement, then tap the layer it belongs in."}
      </p>

      <div className={layout === "stack" ? "grid grid-cols-2 gap-2 mb-6" : "flex flex-wrap gap-2 mb-6"}>
        {trayItems.map((item) => (
          <button
            key={item.id}
            onClick={() => pickUp(item.id)}
            className={`ore-card px-4 py-3 text-sm text-left ${layout === "stack" ? "" : "max-w-xs"}`}
            style={{
              outline: selected === item.id ? "2px solid var(--gold)" : "none",
              outlineOffset: "2px",
            }}
          >
            {item.label}
          </button>
        ))}
        {trayItems.length === 0 && <p className="text-text-dim text-sm">All placed. Ready to check your work.</p>}
      </div>

      <div className="text-center">
        <button className="btn btn-gold" disabled={!allPlaced || submitting} onClick={checkResults}>
          {submitting ? "Checking..." : "Check results"}
        </button>
      </div>
    </div>
  );
}
