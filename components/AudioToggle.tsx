"use client";

import { useEffect, useState } from "react";
import { isMuted, onTrackChange, setMuted } from "@/lib/audioManager";

function IconSpeakerOn() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 5V4L8 9H4Z" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function IconSpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 5V4L8 9H4Z" />
      <path d="M16 9l6 6M22 9l-6 6" />
    </svg>
  );
}

// Mounted once in the root layout so it (and the singleton it controls in
// lib/audioManager) survives client-side navigation between pages. Reflects
// the persisted mute preference (not just whether something happens to be
// playing right now) - onTrackChange fires whenever that preference or
// playback state changes, from anywhere, including the homepage and
// join-page buttons this doesn't own.
export default function AudioToggle() {
  const [muted, setMutedState] = useState(() => isMuted());

  useEffect(() => {
    return onTrackChange(() => setMutedState(isMuted()));
  }, []);

  function toggle() {
    // Unmuting restarts the current track from the top rather than
    // resuming mid-way through - that's an accepted simplification, not
    // a bug.
    setMuted(!muted);
  }

  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={!muted}
      className="bin-icon fixed bottom-6 right-6 z-40 cursor-pointer hover:brightness-125 transition"
      style={{ color: muted ? "#b8a988" : "#fff2c4" }}
    >
      {muted ? <IconSpeakerOff /> : <IconSpeakerOn />}
    </button>
  );
}
