"use client";

// Placeholder until Phase 3 content lands: reuses Build the Tunnel's
// sequencing mechanic and scenario data, plus a pitch-now/dig-deeper
// decision at each depth. Content and scoring aren't written yet, so this
// just lets a team pass through to Round 3 without losing their place.
export default function Round2DigToGold({ onDone }: { onDone: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-xs uppercase tracking-widest text-text-dim mb-2">Round 2 of 3</p>
      <h2 className="text-2xl font-bold mb-3">Dig to Gold</h2>
      <p className="text-text-dim max-w-md mx-auto mb-8">
        Follow one customer story down. At each depth, decide: pitch now, or dig deeper? This round is still being
        built &mdash; for now, keep digging.
      </p>
      <button className="btn btn-gold" onClick={onDone}>Continue digging</button>
    </div>
  );
}
