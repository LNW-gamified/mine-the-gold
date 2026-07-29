"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, Team } from "@/lib/types";
import { ROUND_NAMES } from "@/lib/types";

function makeRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += letters[Math.floor(Math.random() * letters.length)];
  return code;
}

export default function FacilitatorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [label, setLabel] = useState("");
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTeams, setHistoryTeams] = useState<Record<string, Team[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);

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
      <main className="flex-1 flex flex-col items-center px-6 py-16 strata">
        <div className="max-w-md w-full">
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
    <main className="flex-1 flex flex-col strata px-6 py-8">
      <div className="max-w-3xl w-full mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-xs text-text-dim uppercase tracking-widest">{session.label}</p>
            <h1 className="text-3xl font-bold text-nugget stencil">Room code: {session.room_code}</h1>
          </div>
          <button className="btn btn-ghost text-sm" onClick={endSession}>End session</button>
        </header>

        <section className="ore-card-subtle p-6" style={{ borderTopColor: "var(--nugget)" }}>
          <h2 className="font-bold mb-4 stencil text-sm">Live leaderboard</h2>
          {teams.length === 0 && <p className="text-text-dim text-sm">No teams have joined yet. Share the room code above.</p>}
          <ol className="space-y-3">
            {teams.map((t, i) => (
              <li
                key={t.id}
                className={`flex justify-between items-center pb-2 ${i === 0 ? "rounded px-3 py-2 -mx-3" : "border-b border-border"}`}
                style={i === 0 ? { background: "color-mix(in srgb, var(--gold) 8%, var(--surface-raised))" } : undefined}
              >
                <div>
                  <p className="text-sm font-bold">{i + 1}. {t.name}</p>
                  <p className="text-xs text-text-dim">{ROUND_NAMES[t.current_round]}</p>
                </div>
                <span className="text-gold font-bold text-lg">{t.score}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
