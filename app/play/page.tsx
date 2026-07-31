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
import CartBody from "@/components/MineCart";
import RivalTicker from "@/components/RivalTicker";
import IdleLeaderboard from "@/components/IdleLeaderboard";
import GameSummary from "@/components/GameSummary";
import HeroBackground from "@/components/HeroBackground";
import RoundRecap from "@/components/RoundRecap";

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

function IconTrophy() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" />
      <path d="M12 12v3M9 19h6M10 19l.5-4h3l.5 4" />
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
// 5 nodes total: the 4 rounds plus the "Score" node at the end.
const NODE_COUNT = 5;
const RAIL_PADDING_TOP = 26;
const NODE_SIZE = 46;
const SLOT_HEIGHT = NODE_SIZE + 8 + 10 + 44; // 108
const FIRST_NODE_CENTER = RAIL_PADDING_TOP + NODE_SIZE / 2; // 49
const TRACK_HEIGHT = SLOT_HEIGHT * (NODE_COUNT - 1); // 432

export default function PlayPage() {
  const router = useRouter();
  const [sessionId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("mtg_session_id")
  );
  const [teamId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("mtg_team_id")
  );
  const [team, setTeam] = useState<Team | null>(null);
  // Which round's content is currently shown - separate from team.current_round,
  // which is the real, database-backed progression and never changes from a
  // rail click. Resets to match current_round whenever that actually changes
  // (new round unlocked), but otherwise persists so reviewing a completed
  // round doesn't fight with realtime score updates re-rendering the page.
  const [viewingRound, setViewingRound] = useState<number | null>(null);
  const [syncedRound, setSyncedRound] = useState<number | null>(null);
  // Global, facilitator-controlled toggle (app_settings.dev_mode) - not a
  // hardcoded constant, so it can be flipped live for an in-progress
  // session without redeploying.
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (!sessionId || !teamId) router.push("/join");
  }, [sessionId, teamId, router]);

  useEffect(() => {
    supabase.from("app_settings").select("dev_mode").eq("id", true).single().then(({ data }) => {
      if (data) setDevMode(data.dev_mode);
    });

    const channel = supabase
      .channel("app-settings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "id=eq.true" },
        (payload) => setDevMode((payload.new as { dev_mode: boolean }).dev_mode)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  // Adjusted during render rather than in an effect - the recommended React
  // pattern for syncing state from a changing prop without an extra render
  // round-trip. The state guard makes this fire only once per actual
  // current_round change, same as the effect + dependency array it replaces.
  if (team && syncedRound !== team.current_round) {
    setSyncedRound(team.current_round);
    setViewingRound(team.current_round);
  }

  async function advanceRound() {
    if (!teamId || !team) return;
    const nextRound = team.current_round + 1;
    const { data } = await supabase.from("teams").update({ current_round: nextRound }).eq("id", teamId).select("*").single();
    if (data) setTeam(data);
  }

  async function jumpToRound(r: number) {
    if (!devMode) return;
    if (!teamId) return;
    const { data } = await supabase.from("teams").update({ current_round: r }).eq("id", teamId).select("*").single();
    if (data) setTeam(data);
  }

  if (!sessionId || !teamId || !team) {
    return (
      <main className="flex-1 relative flex items-center justify-center text-text-dim">
        <HeroBackground />
        <span className="relative z-10">Loading...</span>
      </main>
    );
  }

  const round = team.current_round;
  const displayRound = viewingRound ?? round;
  const doneSegments = Math.min(Math.max(round - 1, 0), NODE_COUNT - 1);
  const fillHeight = (doneSegments / (NODE_COUNT - 1)) * TRACK_HEIGHT;

  return (
    <>
      <RivalTicker sessionId={sessionId} myTeamId={teamId} />
      <main className="flex-1 relative flex items-start justify-center px-4 py-10 sm:py-16">
        <HeroBackground />
        <div className="frame w-full relative z-10">
          <div className="bolt tl" /><div className="bolt tr" />
          <div className="bolt bl" /><div className="bolt br" />

          <div className="flex">
            <div className="rail">
              <div className="rail-track" style={{ top: FIRST_NODE_CENTER, height: TRACK_HEIGHT }} />
              <div className="rail-track-fill" style={{ top: FIRST_NODE_CENTER, height: fillHeight }} />

              {[1, 2, 3, 4].map((r) => {
                const Icon = ROUND_ICONS[r];
                const completed = round > r;
                // A completed round always opens its read-only recap, dev
                // mode or not - that's the real feature being tested here.
                // DEV_MODE additionally allows jumping ahead to a round not
                // yet reached, for testing; the current round stays
                // non-interactive either way (nothing to jump to or recap).
                const canJumpAhead = devMode && r !== round;
                const onClick = completed
                  ? () => setViewingRound(r)
                  : canJumpAhead
                  ? () => jumpToRound(r)
                  : undefined;
                return (
                  <div
                    key={r}
                    className={`node-wrap ${(completed || canJumpAhead) ? "cursor-pointer" : ""}`}
                    onClick={onClick}
                  >
                    <div className={`node ${round > r ? "done" : round === r ? "active" : ""}`}>
                      <Icon />
                    </div>
                    <div className="node-label">{ROUND_SHORT_NAMES[r]}</div>
                  </div>
                );
              })}

              {/* Score node: grayed/non-interactive until the game is actually
                  complete, then opens the same GameSummary recap shown below
                  on the natural game-complete screen. */}
              <div
                className={`node-wrap ${round >= 5 ? "cursor-pointer" : ""}`}
                onClick={round >= 5 ? () => setViewingRound(5) : undefined}
              >
                <div className={`node ${round >= 5 ? "active" : ""}`}>
                  <IconTrophy />
                </div>
                <div className="node-label">Score</div>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col pt-[30px] px-4 sm:px-11 pb-10">
              <div className="plaque">
                <div>
                  <p className="kicker">{team.name}</p>
                  <h1>{ROUND_NAMES[displayRound]}</h1>
                </div>
                <div className="score-plate">
                  <div className="lbl">Score</div>
                  <div className="val">{team.score}</div>
                </div>
              </div>

              <div className="flex-1">
                {displayRound === 0 && (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-3">Ready to dig, {team.name}?</h2>
                    <p className="text-text-dim mb-8">
                      Four rounds. Every one asks the same question: is this dirt, rock, gold, or a gold nugget?
                      Play at your own pace, no need to wait on anyone else.
                    </p>
                    <button className="btn btn-gold" onClick={advanceRound}>Start Round 1</button>

                    {devMode && (
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
                {displayRound === 1 && (
                  displayRound === round
                    ? <Round1Sort sessionId={sessionId} teamId={teamId} onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={1} />
                )}
                {displayRound === 2 && (
                  displayRound === round
                    ? <Round3DigDeeper sessionId={sessionId} teamId={teamId} onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={2} />
                )}
                {displayRound === 3 && (
                  displayRound === round
                    ? <Round2Tunnel sessionId={sessionId} teamId={teamId} onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={3} />
                )}
                {displayRound === 4 && (
                  displayRound === round
                    ? <Round4FoolsGold sessionId={sessionId} teamId={teamId} onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={4} />
                )}
                {displayRound >= 5 && (
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
