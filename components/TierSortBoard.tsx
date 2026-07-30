"use client";

import { useState, type ReactElement } from "react";

export interface SortItem {
  id: string;
  label: string;
  correctBin: string;
  points: number;
  explanation?: string;
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

function hashStringToRange(str: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// Bin icons, one per bin color: copied from round1-mockup-v3.html's
// .bin-dirt/.bin-rock/.bin-gold icons. Sizing/stroke come from the
// .bin-icon svg CSS rule, not props here.
const BIN_ICON_PROPS = { viewBox: "0 0 24 24", fill: "none", strokeLinejoin: "round" as const };

function IconBinDirt() {
  return (
    <svg {...BIN_ICON_PROPS} strokeLinecap="round">
      <path d="M3 18 Q6 14 9 18 Q12 12 15 18 Q18 13 21 18" />
    </svg>
  );
}

function IconBinRock() {
  return (
    <svg {...BIN_ICON_PROPS}>
      <path d="M4 16 L8 7 L13 12 L16 5 L20 16 Z" />
    </svg>
  );
}

function IconBinGold() {
  return (
    <svg {...BIN_ICON_PROPS}>
      <path d="M4 9 L12 3 L20 9 L12 21 Z" />
    </svg>
  );
}

const BIN_ICONS: Record<string, () => ReactElement> = {
  dirt: IconBinDirt,
  rock: IconBinRock,
  gold: IconBinGold,
};

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
        <h3 className="text-xl font-bold gold-text-shimmer mb-4 text-center">
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
                className="ore-card-row p-4 flex gap-3 items-start"
                style={{
                  borderLeft: `4px solid ${r.correct ? "var(--gold)" : "var(--wildcard)"}`,
                  background: r.correct ? "color-mix(in srgb, var(--gold) 8%, var(--surface-raised))" : undefined,
                }}
              >
                <span className="shrink-0 mt-0.5" style={{ color: r.correct ? "var(--gold)" : "var(--wildcard)" }}>
                  {r.correct ? <IconCheck /> : <IconX />}
                </span>
                <div>
                  <p className="text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-text-dim">
                    You placed: <span className="text-text">{bin?.label}</span>
                    {!r.correct && correctBin && (
                      <> &middot; Correct layer: <span className="text-gold">{correctBin.label}</span></>
                    )}
                    {" "}&middot; {r.points} pts
                  </p>
                  {!r.correct && item.explanation && (
                    <p className="text-xs text-text-dim italic mt-2 pt-2 border-t border-border">
                      {item.explanation}
                    </p>
                  )}
                </div>
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
                className={`bin bin-${bin.colorVar} p-3 min-h-[64px] w-full max-w-full overflow-hidden flex items-center gap-3 text-left ${selected ? "active" : ""}`}
                style={{ ["--bin-color" as string]: `var(--${bin.colorVar})` }}
              >
                {BIN_ICONS[bin.colorVar] && (
                  <span className="bin-icon">{BIN_ICONS[bin.colorVar]()}</span>
                )}
                <p className="stencil text-xs shrink-0" style={{ color: labelColor(bin.colorVar) }}>{bin.label}</p>
                <div className="flex flex-wrap gap-1 justify-end flex-1 min-w-0">
                  {placed.map((i) => (
                    <div
                      key={i.id}
                      onClick={(e) => { e.stopPropagation(); unplace(i.id); }}
                      className="ore-card text-xs px-2 py-1 max-w-[240px] overflow-hidden"
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
                <div className="flex items-center gap-2 mb-2">
                  {BIN_ICONS[bin.colorVar] && (
                    <span className="bin-icon">{BIN_ICONS[bin.colorVar]()}</span>
                  )}
                  <p className="stencil text-xs" style={{ color: labelColor(bin.colorVar) }}>{bin.label}</p>
                </div>
                <div className="space-y-1">
                  {placed.map((i) => (
                    <div
                      key={i.id}
                      onClick={(e) => { e.stopPropagation(); unplace(i.id); }}
                      className="ore-card text-xs px-2 py-1"
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
            className={`ore-card px-4 py-3 text-sm text-left ${layout === "stack" ? "" : "max-w-xs"} ${selected === item.id ? "selected" : ""}`}
            style={{ ["--card-rotate" as string]: `${hashStringToRange(item.id, -1.5, 1.5)}deg` }}
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
