"use client";

// Placeholder until Phase 3 content lands: Stage A is checklist reasoning
// (number, named consequence, right person), Stage B is a timed rapid-fire
// classification against Fool's Gold near-misses. Content and scoring
// aren't written yet, so this just lets a team finish the game without
// losing their place.
export default function Round3KnowYourGold({ onDone }: { onDone: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-xs uppercase tracking-widest text-text-dim mb-2">Round 3 of 3</p>
      <h2 className="text-2xl font-bold mb-3">Know Your Gold</h2>
      <p className="text-text-dim max-w-md mx-auto mb-8">
        Check the three signs, then prove you can spot real Gold under pressure &mdash; the clock is running. This
        round is still being built &mdash; for now, finish the dig.
      </p>
      <button className="btn btn-gold" onClick={onDone}>Finish the dig</button>
    </div>
  );
}
