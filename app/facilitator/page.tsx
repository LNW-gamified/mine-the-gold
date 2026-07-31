"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient as createAuthClient } from "@/lib/supabase/client";
import { playTrack } from "@/lib/audioManager";
import type { Session, Team } from "@/lib/types";
import { MAX_POSSIBLE_SCORE, ROUND_SHORT_NAMES } from "@/lib/types";
import CartBody from "@/components/MineCart";
import FacilitatorInsights from "@/components/FacilitatorInsights";
import HeroBackground from "@/components/HeroBackground";

function makeRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += letters[Math.floor(Math.random() * letters.length)];
  return code;
}

// "Round 1 - Sort" for the actual numbered rounds; "Start"/"Done" (with no
// round number, since neither is really "Round 0" or "Round 5") for the
// two bookend states.
function roundStatusLabel(currentRound: number): string {
  const short = ROUND_SHORT_NAMES[currentRound] ?? "—";
  return currentRound >= 1 && currentRound <= 4 ? `Round ${currentRound} - ${short}` : short;
}

// Nugget decoration tiers copied from leaderboard-race.html's three example
// carts (1st place = 3 nuggets, 2nd = 1, 3rd = 0), applied by rank rather
// than a score formula since the mockup only defines these three states.
const CART_NUGGETS: Record<"full" | "medium" | "empty", { cx: number; cy: number; r: number; fill: string }[]> = {
  full: [
    { cx: 14, cy: 12, r: 2.5, fill: "#fff2c4" },
    { cx: 22, cy: 10, r: 3, fill: "#e8b13d" },
    { cx: 29, cy: 13, r: 2, fill: "#fff2c4" },
  ],
  medium: [{ cx: 18, cy: 11, r: 2.5, fill: "#e8b13d" }],
  empty: [],
};

function CartSvg({ tier }: { tier: "full" | "medium" | "empty" }) {
  return (
    <svg viewBox="0 0 46 30">
      <CartBody bodyFill="var(--gold)" bodyStroke="var(--nugget)" panelFill="#8a6b1f" />
      {CART_NUGGETS[tier].map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} />
      ))}
    </svg>
  );
}

export default function FacilitatorPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [label, setLabel] = useState("");
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTeams, setHistoryTeams] = useState<Record<string, Team[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Asserted here so this page is never at the mercy of leftover team-song
  // from browsing the homepage/join flow earlier in the same tab - the
  // facilitator screen always gets the mine ambience, never the join
  // screen's team-hype track.
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
    const sid = localStorage.getItem("mtg_facilitator_session_id");
    if (sid) {
      supabase.from("sessions").select("*").eq("id", sid).single().then(({ data }) => {
        if (data) setSession(data);
      });
    }
    supabase.from("sessions").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setPastSessions(data);
    });
  }, []);

  useEffect(() => {
    if (!session) return;

    const refresh = () =>
      supabase.from("teams").select("*").eq("session_id", session.id).order("score", { ascending: false }).then(({ data }) => {
        if (data) setTeams(data);
      });
    refresh();

    const channel = supabase
      .channel(`fac-teams-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${session.id}` }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function createSession() {
    const room_code = makeRoomCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ label: label.trim() || "Into the Mine", room_code })
      .select("*")
      .single();
    if (data && !error) {
      localStorage.setItem("mtg_facilitator_session_id", data.id);
      setSession(data);
    }
  }

  async function toggleDevMode() {
    const { data } = await supabase
      .from("app_settings")
      .update({ dev_mode: !devMode })
      .eq("id", true)
      .select("dev_mode")
      .single();
    if (data) setDevMode(data.dev_mode);
  }

  async function logout() {
    const authClient = createAuthClient();
    await authClient.auth.signOut();
    router.push("/facilitator/login");
    router.refresh();
  }

  async function endSession() {
    if (!session) return;
    await supabase.from("sessions").update({ active: false }).eq("id", session.id);
    localStorage.removeItem("mtg_facilitator_session_id");
    setSession(null);
  }

  async function loadHistoryTeams(sid: string) {
    if (historyTeams[sid]) return;
    const { data } = await supabase.from("teams").select("*").eq("session_id", sid).order("score", { ascending: false });
    setHistoryTeams((h) => ({ ...h, [sid]: data || [] }));
  }

  if (!session) {
    return (
      <main className="flex-1 relative flex flex-col items-center px-6 py-16">
        <HeroBackground />
        <div className="max-w-md w-full relative z-10">
          <div className="flex justify-end items-center gap-3 mb-4">
            <button
              className={`btn text-xs ${devMode ? "btn-gold" : "btn-ghost"}`}
              onClick={toggleDevMode}
            >
              Dev mode: {devMode ? "ON" : "OFF"}
            </button>
            <button className="text-xs text-text-dim underline" onClick={logout}>Log out</button>
          </div>
          <div className="ore-card-subtle p-8 mb-8" style={{ borderTopColor: "var(--gold)" }}>
            <h1 className="text-2xl font-bold mb-1 stencil">Start a session</h1>
            <p className="text-text-dim text-sm mb-6">
              Reps join with a room code and play at their own pace. Every round auto-scores, nothing to run from your end once it starts.
            </p>
            <label className="block text-sm mb-1 text-text-dim">Session label</label>
            <input
              className="w-full mb-4"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. GovWin Discovery - Aug cohort"
            />
            <button className="btn btn-gold w-full" onClick={createSession}>Create room</button>
          </div>

          <button className="text-sm text-text-dim underline" onClick={() => setHistoryOpen(!historyOpen)}>
            {historyOpen ? "Hide" : "View"} past sessions ({pastSessions.length})
          </button>

          {historyOpen && (
            <div className="mt-4 space-y-3">
              {pastSessions.map((s) => (
                <div key={s.id} className="ore-card-subtle p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="font-bold">{s.label}</p>
                    <p className="text-xs text-text-dim">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <button className="text-xs underline text-text-dim" onClick={() => loadHistoryTeams(s.id)}>
                    Show team scores
                  </button>
                  {historyTeams[s.id] && (
                    <ul className="mt-2 text-sm">
                      {historyTeams[s.id].map((t) => (
                        <li key={t.id} className="flex justify-between text-text-dim">
                          <span>{t.name}</span>
                          <span className="text-gold">{t.score}</span>
                        </li>
                      ))}
                      {historyTeams[s.id].length === 0 && <li className="text-text-dim">No teams joined.</li>}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 relative flex flex-col px-6 py-8">
      <HeroBackground />
      <div className="max-w-3xl w-full mx-auto relative z-10">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-xs text-text-dim uppercase tracking-widest">{session.label}</p>
            <h1 className="text-3xl font-bold text-nugget stencil">Room code: {session.room_code}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`btn text-sm ${devMode ? "btn-gold" : "btn-ghost"}`}
              onClick={toggleDevMode}
            >
              Dev mode: {devMode ? "ON" : "OFF"}
            </button>
            <button className="btn btn-ghost text-sm" onClick={endSession}>End session</button>
            <button className="btn btn-ghost text-sm" onClick={logout}>Log out</button>
          </div>
        </header>

        <section className="frame p-6">
          <div className="bolt tl" /><div className="bolt tr" />
          <div className="bolt bl" /><div className="bolt br" />
          <h2 className="font-bold mb-4 stencil text-sm">Live leaderboard</h2>
          {teams.length === 0 && <p className="text-text-dim text-sm">No teams have joined yet. Share the room code above.</p>}
          {teams.map((t, i) => {
            const pos = Math.min((t.score / MAX_POSSIBLE_SCORE) * 100, 100);
            const tier = i === 0 ? "full" : i === 1 ? "medium" : "empty";
            return (
              <div key={t.id} className={`lane ${i === 0 ? "first" : ""}`}>
                <div className="lane-head">
                  <span className="lane-name">
                    <span className="lane-rank">{i + 1}.</span>
                    {t.name}
                  </span>
                  <span className="lane-score">{t.score}</span>
                </div>
                <p className="text-xs text-text-dim mb-2">On: {roundStatusLabel(t.current_round)}</p>
                <div className="track">
                  <div className="rail-ties" />
                  <div className="finish" />
                  <div className="cart" style={{ left: `max(0px, calc(${pos}% - 46px))` }}>
                    <CartSvg tier={tier} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="frame p-6 mt-6">
          <div className="bolt tl" /><div className="bolt tr" />
          <div className="bolt bl" /><div className="bolt br" />
          <button
            className="flex justify-between items-center w-full gap-2 text-left"
            onClick={() => setInsightsOpen(!insightsOpen)}
          >
            <h2 className="font-bold stencil text-sm">Coaching insights</h2>
            <span className="text-xs text-text-dim underline shrink-0">{insightsOpen ? "Hide" : "Show"}</span>
          </button>
          {insightsOpen && (
            <div className="mt-4">
              <FacilitatorInsights sessionId={session.id} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
