"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { playTrack } from "@/lib/audioManager";
import type { Team } from "@/lib/types";
import { ROUND_NAMES } from "@/lib/types";
import Round1SpotSignal from "@/components/rounds/Round1SpotSignal";
import Round2DigToGold from "@/components/rounds/Round2DigToGold";
import Round3KnowYourGold from "@/components/rounds/Round3KnowYourGold";
import DepthRail from "@/components/DepthRail";
import RivalTicker from "@/components/RivalTicker";
import GameSummary from "@/components/GameSummary";
import HeroBackground from "@/components/HeroBackground";
import RoundRecap from "@/components/RoundRecap";

// Illustrated cart (near-square, ~1.05:1 within a 1024x1024 canvas), not the
// shared SVG CartBody shape used by the facilitator leaderboard - that one's
// 46:30 sizing doesn't fit this image. Bounces in once on mount via
// .cart-entrance; this component only ever renders once per game-complete
// screen, so there's no re-trigger to guard against.
function CelebrationCart() {
  return (
    <Image
      src="/mine-cart.png"
      alt=""
      width={1024}
      height={1024}
      className="cart-entrance mx-auto"
      style={{ width: "100%", maxWidth: 280, height: "auto" }}
      priority
    />
  );
}

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

  // Asserted here (not just left to the join page's post-submit call) so
  // this page is never at the mercy of leftover team-song from wherever the
  // browser tab was before - a refresh, a resumed session, or a facilitator
  // who never went through /join in this tab all land here with the right
  // ambience instead of inheriting whatever was last playing.
  useEffect(() => {
    playTrack("/sounds/ambient-cave.mp3", { loop: true, volume: 0.25 });
  }, []);

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

  return (
    <>
      <RivalTicker sessionId={sessionId} myTeamId={teamId} />
      <main className="flex-1 relative flex items-start justify-center px-4 py-10 sm:py-16">
        <HeroBackground />
        <div className="frame w-full relative z-10">
          <div className="bolt tl" /><div className="bolt tr" />
          <div className="bolt bl" /><div className="bolt br" />

          <div className="flex">
            <DepthRail
              round={round}
              viewingRound={displayRound}
              devMode={devMode}
              onViewRound={setViewingRound}
              onJumpToRound={jumpToRound}
            />

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
                      Work your way through the levels of the mine. Along the way, ask yourself,
                      is this dirt, rock, or gold?
                    </p>
                    <button className="btn btn-gold" onClick={advanceRound}>Start Round 1</button>

                    {devMode && (
                      <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs text-text-dim uppercase tracking-widest mb-2">Dev: jump to round</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {[1, 2, 3].map((r) => (
                            <button key={r} className="btn btn-ghost text-xs" onClick={() => jumpToRound(r)}>
                              {r}. {ROUND_NAMES[r]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {displayRound === 1 && (
                  displayRound === round
                    ? <Round1SpotSignal sessionId={sessionId} teamId={teamId} onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={1} />
                )}
                {displayRound === 2 && (
                  displayRound === round
                    ? <Round2DigToGold onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={2} />
                )}
                {displayRound === 3 && (
                  displayRound === round
                    ? <Round3KnowYourGold onDone={advanceRound} />
                    : <RoundRecap teamId={teamId} round={3} />
                )}
                {displayRound >= 4 && (
                  <div className="text-center py-12">
                    <CelebrationCart />
                    <GameSummary teamId={teamId} finalScore={team.score} />
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
