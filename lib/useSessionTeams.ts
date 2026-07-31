"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";

export function useSessionTeams(sessionId: string | null): Team[] {
  const [teams, setTeams] = useState<Team[]>([]);
  // Two components can call this hook for the same session at once (e.g.
  // RivalTicker and IdleLeaderboard are both mounted on the game-complete
  // screen). A channel name keyed only by sessionId collides between them -
  // Supabase throws once the first instance has already subscribed - so each
  // hook instance gets its own channel via a stable per-instance id.
  const instanceId = useId();

  useEffect(() => {
    if (!sessionId) return;

    const refresh = () =>
      supabase
        .from("teams")
        .select("*")
        .eq("session_id", sessionId)
        .order("score", { ascending: false })
        .then(({ data }) => {
          if (data) setTeams(data);
        });

    refresh();

    const channel = supabase
      .channel(`session-teams-${sessionId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${sessionId}` },
        refresh
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, instanceId]);

  return teams;
}
