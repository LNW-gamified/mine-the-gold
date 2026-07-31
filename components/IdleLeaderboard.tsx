"use client";

import { useSessionTeams } from "@/lib/useSessionTeams";
import { ROUND_SHORT_NAMES } from "@/lib/types";

export default function IdleLeaderboard({ sessionId, myTeamId }: { sessionId: string; myTeamId: string }) {
  const teams = useSessionTeams(sessionId);
  const stillDigging = teams.filter((t) => t.current_round < 5 && t.id !== myTeamId);

  if (teams.length < 2) return null;

  return (
    <div className="ore-card p-5 mt-8 max-w-md mx-auto text-left">
      <p className="stencil text-xs text-gold mb-3">While you wait</p>
      <div className="space-y-2">
        {teams.map((t, i) => (
          <div key={t.id} className="flex justify-between items-center text-sm">
            <span className={t.id === myTeamId ? "text-gold font-bold" : "text-text"}>
              {i + 1}. {t.name}{t.id === myTeamId ? " (you)" : ""}
            </span>
            <span className="text-text-dim text-xs">
              {t.score} pts &middot; {t.current_round >= 5 ? "finished" : ROUND_SHORT_NAMES[t.current_round]}
            </span>
          </div>
        ))}
      </div>
      {stillDigging.length > 0 && (
        <p className="text-text-dim text-xs mt-4 italic">
          {stillDigging.length} team{stillDigging.length === 1 ? "" : "s"} still digging. Scores update live.
        </p>
      )}
    </div>
  );
}
