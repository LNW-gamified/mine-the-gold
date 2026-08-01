"use client";

// Persistent progress marker for the 3-round shell (depth_rail_mockup.html).
// Purely presentational: clickability mirrors the old per-round rail's
// rules (view a completed round's recap, return to the in-progress round,
// or - in dev mode - jump to a round not yet reached), but the actual
// state changes (switching displayed content vs. writing team.current_round)
// stay owned by the caller via onViewRound/onJumpToRound.

const TICK_TOP: Record<number, number> = { 1: 14, 2: 48, 3: 82 };
const COMPLETE_TOP = 96;

function markerTop(round: number) {
  if (round <= 1) return TICK_TOP[1];
  if (round === 2) return TICK_TOP[2];
  if (round === 3) return TICK_TOP[3];
  return COMPLETE_TOP;
}

export default function DepthRail({
  round,
  viewingRound,
  devMode,
  onViewRound,
  onJumpToRound,
}: {
  round: number;
  viewingRound: number;
  devMode: boolean;
  onViewRound: (r: number) => void;
  onJumpToRound: (r: number) => void;
}) {
  const complete = round >= 4;

  return (
    <div className="depth-rail">
      <div className="depth-rail-track" />

      {[1, 2, 3].map((i) => {
        const reached = round > i || complete;
        const current = round === i;
        const canReturnToCurrent = current && viewingRound !== round;
        const canJumpAhead = devMode && i !== round;
        const clickable = reached || canReturnToCurrent || canJumpAhead;

        return (
          <button
            key={i}
            type="button"
            className={`depth-rail-tick ${reached ? "reached" : ""} ${current ? "current" : ""}`}
            style={{ top: `${TICK_TOP[i]}%` }}
            disabled={!clickable}
            aria-label={`Round ${i}`}
            onClick={() => {
              if (reached || canReturnToCurrent) onViewRound(i);
              else if (canJumpAhead) onJumpToRound(i);
            }}
          >
            {i}
          </button>
        );
      })}

      <button
        type="button"
        className="depth-rail-gold"
        disabled={!complete}
        aria-label="Game complete"
        onClick={() => complete && onViewRound(4)}
      >
        💰
      </button>

      <div className="depth-rail-marker" style={{ top: `${markerTop(round)}%` }}>
        <svg viewBox="0 0 46 30" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="34" height="16" rx="2" fill="#3a2a14" stroke="#5a4022" strokeWidth="1.5" />
          <path d="M6,6 L10,0 L34,0 L38,6 Z" fill="#4a3418" />
          <circle cx="12" cy="24" r="5" fill="#0e0a05" stroke="#2a2015" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="5" fill="#0e0a05" stroke="#2a2015" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
