"use client";

import { useEffect, useState } from "react";
import { getLastTrack, isTrackPlaying, onTrackChange, playTrack, stopTrack } from "@/lib/audioManager";

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
// whatever's actually playing rather than tracking its own on/off
// assumption - onTrackChange fires whenever playTrack/stopTrack is called
// from anywhere, including the homepage and join-page buttons this doesn't
// own.
export default function AudioToggle() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(isTrackPlaying());
    return onTrackChange(() => setPlaying(isTrackPlaying()));
  }, []);

  function toggle() {
    if (playing) {
      stopTrack();
      return;
    }
    // Unmuting restarts the current track from the top rather than
    // resuming mid-way through - that's an accepted simplification, not
    // a bug.
    const last = getLastTrack();
    if (last) playTrack(last.src, last.opts);
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Mute sound" : "Unmute sound"}
      aria-pressed={playing}
      className="bin-icon fixed bottom-6 left-6 z-40 cursor-pointer hover:brightness-125 transition"
      style={{ color: playing ? "#fff2c4" : "#b8a988" }}
    >
      {playing ? <IconSpeakerOn /> : <IconSpeakerOff />}
    </button>
  );
}
