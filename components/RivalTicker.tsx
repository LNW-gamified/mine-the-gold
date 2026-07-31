"use client";

import { useEffect, useRef, useState } from "react";
import { useSessionTeams } from "@/lib/useSessionTeams";

export default function RivalTicker({ sessionId, myTeamId }: { sessionId: string; myTeamId: string }) {
  const teams = useSessionTeams(sessionId);
  const [toast, setToast] = useState<string | null>(null);
  const prevRankRef = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (teams.length < 2) return;

    const myIndex = teams.findIndex((t) => t.id === myTeamId);
    if (myIndex === -1) return;
    const myRank = myIndex + 1;

    const prevRank = prevRankRef.current;
    if (prevRank !== null && myRank > prevRank) {
      // Someone passed us. Find who's now just ahead.
      const overtaker = teams[myIndex - 1];
      if (overtaker) {
        setToast(`${overtaker.name} just passed you. ${overtaker.score} points and climbing.`);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setToast(null), 5000);
      }
    }
    prevRankRef.current = myRank;
  }, [teams, myTeamId]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

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
