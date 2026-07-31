"use client";

import { useEffect, useState } from "react";
import { useSessionTeams } from "@/lib/useSessionTeams";

export default function RivalTicker({ sessionId, myTeamId }: { sessionId: string; myTeamId: string }) {
  const teams = useSessionTeams(sessionId);
  const [toast, setToast] = useState<string | null>(null);
  const [prevRank, setPrevRank] = useState<number | null>(null);

  // Detected during render rather than in an effect - the recommended React
  // pattern for adjusting state off a prop/dependency change without an
  // extra render round-trip. The state guard fires this only once per actual
  // rank change, same as the effect + dependency array it replaces.
  if (teams.length >= 2) {
    const myIndex = teams.findIndex((t) => t.id === myTeamId);
    if (myIndex !== -1) {
      const myRank = myIndex + 1;
      if (prevRank !== myRank) {
        setPrevRank(myRank);
        if (prevRank !== null && myRank > prevRank) {
          // Someone passed us. Find who's now just ahead.
          const overtaker = teams[myIndex - 1];
          if (overtaker) {
            setToast(`${overtaker.name} just passed you. ${overtaker.score} points and climbing.`);
          }
        }
      }
    }
  }

  // Auto-hides whatever toast is currently showing. Keying on `toast` means
  // React's own cleanup-before-rerun handles resetting the timer on a fresh
  // overtake the same way the old manual clearTimeout+reassign did.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md z-40 ore-card px-4 py-3 text-sm flex items-center gap-3"
      style={{ borderLeft: "4px solid var(--gold)", position: "fixed" }}
    >
      <svg width="28" height="18" viewBox="0 0 46 30" className="shrink-0">
        <rect x="4" y="6" width="34" height="16" rx="2" fill="#3a2a14" stroke="#e8b13d" strokeWidth="1.5" />
        <path d="M6,6 L10,0 L34,0 L38,6 Z" fill="#4a3418" />
        <circle cx="12" cy="24" r="5" fill="#0e0a05" />
        <circle cx="32" cy="24" r="5" fill="#0e0a05" />
      </svg>
      <span>{toast}</span>
    </div>
  );
}
