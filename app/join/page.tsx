"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import HeroBackground from "@/components/HeroBackground";
import { playTrack } from "@/lib/audioManager";

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const code = roomCode.trim().toUpperCase();
    const name = teamName.trim();

    if (!code || !name) {
      setError("Enter both a room code and a team name.");
      setLoading(false);
      return;
    }

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, active")
      .eq("room_code", code)
      .maybeSingle();

    if (sessionErr || !session) {
      setError("No session found for that room code. Double-check with your facilitator.");
      setLoading(false);
      return;
    }

    if (!session.active) {
      setError("This session has ended.");
      setLoading(false);
      return;
    }

    // Reuse an existing team row if this name already joined this session,
    // otherwise create one.
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("session_id", session.id)
      .eq("name", name)
      .maybeSingle();

    let teamId = existing?.id;

    if (!teamId) {
      const { data: created, error: createErr } = await supabase
        .from("teams")
        .insert({ session_id: session.id, name })
        .select("id")
        .single();

      if (createErr || !created) {
        setError("Couldn't create your team. Try a different name.");
        setLoading(false);
        return;
      }
      teamId = created.id;
    }

    localStorage.setItem("mtg_session_id", session.id);
    localStorage.setItem("mtg_team_id", teamId);
    localStorage.setItem("mtg_team_name", name);
    playTrack("/sounds/ambient-cave.mp3", { loop: true, volume: 0.25 });
    router.push("/play");
  }

  return (
    <main className="flex-1 relative flex items-center justify-center px-6">
      <HeroBackground />
      <form onSubmit={handleJoin} className="ore-card-subtle p-8 w-full max-w-sm relative z-10" style={{ borderTopColor: "var(--gold)" }}>
        <h1 className="text-2xl font-bold mb-1">Join the dig</h1>
        <p className="text-text-dim text-sm mb-6">Enter your facilitator&apos;s room code and pick a team name.</p>

        <label className="block text-sm mb-1 text-text-dim">Room code</label>
        <input
          className="w-full mb-4"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="e.g. GOLD42"
          autoCapitalize="characters"
        />

        <label className="block text-sm mb-1 text-text-dim">Team name</label>
        <input
          className="w-full mb-6"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Deep Diggers"
        />

        {error && <p className="text-wildcard text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-gold w-full">
          {loading ? "Joining..." : "Start digging"}
        </button>
      </form>
    </main>
  );
}
