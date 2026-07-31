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
import CaveBackground from "@/components/CaveBackground";
import CartBody from "@/components/MineCart";
import RivalTicker from "@/components/RivalTicker";
import IdleLeaderboard from "@/components/IdleLeaderboard";
import GameSummary from "@/components/GameSummary";

// Set to false to lock rounds back to sequential progression for a real session.
const DEV_MODE_FREE_NAV = true;

// Purely celebratory: always ends up full and overflowing regardless of the
// team's actual score, so the count/positions here are fixed, not derived
// from points. Delays are staggered ~130ms apart per nugget.
const CELEBRATION_NUGGETS = [
  { cx: 11, cy: 13, r: 2.5, fill: "#fff2c4", delay: 0 },
  { cx: 17, cy: 7, r: 3, fill: "#e8b13d", delay: 130 },
  { cx: 23, cy: 4, r: 2.5, fill: "#fff2c4", delay: 260 },
  { cx: 29, cy: 6, r: 3, fill: "#e8b13d", delay: 390 },
  { cx: 34, cy: 12, r: 2, fill: "#fff2c4", delay: 520 },
  { cx: 20, cy: 13, r: 2.5, fill: "#e8b13d", delay: 650 },
];

function CelebrationCart() {
  return (
    <svg viewBox="0 0 46 30" width={230} height={150} className="mx-auto">
      <CartBody />
      {CELEBRATION_NUGGETS.map((n, i) => (
        <circle
          key={i}
          className="cart-nugget"
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill={n.fill}
          style={{ animationDelay: `${n.delay}ms` }}
        />
      ))}
    </svg>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Rail node icons: copied from round1-mockup-v3.html's node-wrap SVGs
// ("Dirt"/shovel, "Tunnel", "Dig"/magnifier, "Fool's Gold"/diamond).
// Sizing/stroke-width/color come from the .node svg CSS rule, not props here.
function IconShovel() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3 L12 15 M7 9 L12 3 L17 9" />
      <path d="M6 15 h12 l-1.5 6 h-9 z" />
    </svg>
  );
}

function IconTunnel() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 16 L8 8 L12 14 L16 6 L20 16" />
    </svg>
  );
}

function IconMagnifier() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="10" cy="10" r="6" />
      <path d="M15 15 L20 20" />
    </svg>
  );
}

function IconDiamond() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 9 L12 3 L20 9 L12 21 Z M4 9 L12 21 M20 9 L12 21 M12 3 L8 9 M12 3 L16 9" />
    </svg>
  );
}

const ROUND_ICONS: Record<number, () => ReactElement> = {
  1: IconShovel,
  2: IconMagnifier,
  3: IconTunnel,
  4: IconDiamond,
};

// Rail track/fill geometry, matching the .rail/.node/.node-label CSS in
// globals.css: 26px rail padding-top, a 46px node, an 8px label margin-top,
// a 10px label height (line-height: 1 at font-size 10px), and a 44px
// node-wrap margin-bottom. The mockup hardcodes rail-track-fill to a static
// 0px placeholder and its own top/bottom insets don't correspond to any of
// these numbers, so the real top/height are computed here instead.
const ROUND_COUNT = 4;
const RAIL_PADDING_TOP = 26;
const NODE_SIZE = 46;
const SLOT_HEIGHT = NODE_SIZE + 8 + 10 + 44; // 108
const FIRST_NODE_CENTER = RAIL_PADDING_TOP + NODE_SIZE / 2; // 49
const TRACK_HEIGHT = SLOT_HEIGHT * (ROUND_COUNT - 1); // 324

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

  async function jumpToRound(r: number) {
    if (!DEV_MODE_FREE_NAV) return;
    if (!teamId) return;
    const { data } = await supabase.from("teams").update({ current_round: r }).eq("id", teamId).select("*").single();
    if (data) setTeam(data);
  }

  if (!sessionId || !teamId || !team) {
    return (
      <>
        <CaveBackground />
        <main className="flex-1 flex items-center justify-center text-text-dim relative z-10">Loading...</main>
      </>
    );
  }

  const round = team.current_round;
  const doneSegments = Math.min(Math.max(round - 1, 0), ROUND_COUNT - 1);
  const fillHeight = (doneSegments / (ROUND_COUNT - 1)) * TRACK_HEIGHT;

  return (
    <>
      <CaveBackground />
      <RivalTicker sessionId={sessionId} myTeamId={teamId} />
      <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16 relative z-10">
        <div className="frame w-full">
          <div className="bolt tl" /><div className="bolt tr" />
          <div className="bolt bl" /><div className="bolt br" />

          <div className="flex">
            <div className="rail">
              <div className="rail-track" style={{ top: FIRST_NODE_CENTER, height: TRACK_HEIGHT }} />
              <div className="rail-track-fill" style={{ top: FIRST_NODE_CENTER, height: fillHeight }} />

              {[1, 2, 3, 4].map((r) => {
                const Icon = ROUND_ICONS[r];
                return (
                  <div
                    key={r}
                    className={`node-wrap ${DEV_MODE_FREE_NAV ? "cursor-pointer" : ""}`}
                    onClick={DEV_MODE_FREE_NAV ? () => jumpToRound(r) : undefined}
                  >
                    <div className={`node ${round > r ? "done" : round === r ? "active" : ""}`}>
                      <Icon />
                    </div>
                    <div className="node-label">{ROUND_SHORT_NAMES[r]}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 min-w-0 flex flex-col pt-[30px] px-4 sm:px-11 pb-10">
              <div className="plaque">
                <div>
                  <p className="kicker">{team.name}</p>
                  <h1>{ROUND_NAMES[round]}</h1>
                </div>
                <div className="score-plate">
                  <div className="lbl">Score</div>
                  <div className="val">{team.score}</div>
                </div>
              </div>

              <div className="flex-1">
                {round === 0 && (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-3">Ready to dig, {team.name}?</h2>
                    <p className="text-text-dim mb-8">
                      Four rounds. Every one asks the same question: is this dirt, rock, gold, or a gold nugget?
                      Play at your own pace, no need to wait on anyone else.
                    </p>
                    <button className="btn btn-gold" onClick={advanceRound}>Start Round 1</button>

                    {DEV_MODE_FREE_NAV && (
                      <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs text-text-dim uppercase tracking-widest mb-2">Dev: jump to round</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {[1, 2, 3, 4].map((r) => (
                            <button key={r} className="btn btn-ghost text-xs" onClick={() => jumpToRound(r)}>
                              {r}. {ROUND_SHORT_NAMES[r]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {round === 1 && <Round1Sort sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
                {round === 2 && <Round3DigDeeper sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
                {round === 3 && <Round2Tunnel sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
                {round === 4 && <Round4FoolsGold sessionId={sessionId} teamId={teamId} onDone={advanceRound} />}
                {round >= 5 && (
                  <div className="text-center py-12">
                    <CelebrationCart />
                    <GameSummary teamId={teamId} finalScore={team.score} />
                    <IdleLeaderboard sessionId={sessionId} myTeamId={teamId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
