"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { ROUND_NAMES, ROUND_SHORT_NAMES } from "@/lib/types";
import Round1Sort from "@/components/rounds/Round1Sort";
import Round2Tunnel from "@/components/rounds/Round2Tunnel";
import Round3DigDeeper from "@/components/rounds/Round3DigDeeper";
import Round4FoolsGold from "@/components/rounds/Round4FoolsGold";
import Round5Bonus from "@/components/rounds/Round5Bonus";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconPickaxe() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 11c3-6 7-9 10-9s7 3 10 9" />
      <path d="M13 4 7 19" />
    </svg>
  );
}

function IconTunnel() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 20V11a8 8 0 0 1 16 0v9" />
      <path d="M8 20v-5a4 4 0 0 1 8 0v5" />
      <path d="M2 20h20" />
    </svg>
  );
}

function IconLantern() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5 20 20" />
    </svg>
  );
}

function IconGem() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 3h12l4 6-10 12L2 9Z" />
      <path d="M2 9h20" />
      <path d="M9 3l3 6 3-6" />
    </svg>
  );
}

const ROUND_ICONS: Record<number, () => ReactElement> = {
  1: IconPickaxe,
  2: IconTunnel,
  3: IconLantern,
  4: IconPickaxe,
  5: IconGem,
};

export default function PlayPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("mtg_session_id");
    const tid = localStorage.getItem("mtg_team_id");
    if (!sid || !tid) {
      router.push("/join");
      return;
    }
    setSessionId(sid);
    setTeamId(tid);
  }, [router]);

  useEffect(() => {
    if (!teamId) return;
    supabase.from("teams").select("*").eq("id", teamId).single().then(({ data }) => setTeam(data));

    const channel = supabase
      .channel(`team-${teamId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teams", filter: `id=eq.${teamId}` },
        (payload) => setTeam(payload.new as Team)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId]);

  async function advanceRound() {
    if (!teamId || !team) return;
    const nextRound = team.current_round + 1;
    const { data } = await supabase.from("teams").update({ current_round: nextRound }).eq("id", teamId).select("*").single();
    if (data) setTeam(data);
  }

  if (!sessionId || !teamId || !team) {
    return <main className="flex-1 flex items-center justify-center text-text-dim">Loading...</main>;
  }

  const round = team.current_round;

  return (
    <main className="flex-1 flex strata">
      <aside className="depth-rail w-16 sm:w-20 flex flex-col items-center py-6 gap-4 relative">
        {/* Line spans icon-center to icon-center: top-10 = py-6 + half of the 32px node; height covers
            the 4 gaps between the 5 nodes given the fixed 32px icon + 24px label row height. */}
        <div className="absolute left-1/2 -translate-x-1/2 top-10 w-[2px] h-[304px] flex flex-col" aria-hidden="true">
          {[1, 2, 3, 4].map((seg) => (
            <div key={seg} className="flex-1" style={{ background: round > seg ? "var(--gold)" : "var(--border)" }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((r) => {
          const Icon = ROUND_ICONS[r];
          return (
            <div key={r} className="relative flex flex-col items-center gap-1">
              <div className={`depth-node w-8 h-8 rounded-full flex items-center justify-center ${round > r ? "done" : round === r ? "active" : ""}`}>
                <Icon />
              </div>
              <span
                className="text-[9px] leading-[10px] text-center w-14 h-6 flex items-center justify-center"
                style={{ color: "var(--rail-label)" }}
              >
                {ROUND_SHORT_NAMES[r]}
              </span>
            </div>
          );
        })}
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-border px-6 py-4 flex justify-between items-center bg-bg/80">
          <div>
            <p className="text-xs text-text-dim uppercase tracking-widest">{team.name}</p>
            <h1 className="text-lg font-bold text-nugget stencil">{ROUND_NAMES[round]}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-dim uppercase tracking-widest">Score</p>
            <p className="text-2xl font-bold text-gold">{team.score}</p>
          </div>
        </header>

        <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">
          {round === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-3">Ready to dig, {team.name}?</h2>
              <p className="text-text-dim mb-8">
                Five rounds. Every one asks the same question: is this dirt, rock, gold, or a gold nugget?
                Play at your own pace, no need to wait on anyone else.
              </p>
              <button className="btn btn-gold" onClick={advanceRound}>Start Round 1</button>
            </div>
          )}
          {round === 1 && <Round1Sort sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
          {round === 2 && <Round2Tunnel sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
          {round === 3 && <Round3DigDeeper sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
          {round === 4 && <Round4FoolsGold sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
          {round === 5 && <Round5Bonus sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
          {round >= 6 && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold text-nugget mb-2 stencil">The dig is done</h2>
              <p className="text-text-dim mb-2">Final score: {team.score} points</p>
              <p className="text-text-dim text-sm">Check the facilitator&apos;s screen for how your team stacked up.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
