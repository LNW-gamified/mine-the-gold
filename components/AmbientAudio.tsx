"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mtg_ambient_audio_on";

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

// Default is muted/off (browsers block autoplay-with-sound anyway); the on/
// off choice is read from and written to sessionStorage so it survives a
// reload or round change within the same tab but not a brand new session.
export default function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "on") setOn(true);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!on) {
      audio.pause();
      return;
    }

    // A direct click supplies its own user gesture, so play() resolves
    // immediately. Restoring "on" from sessionStorage on mount doesn't -
    // there's no fresh gesture behind it - so the browser blocks it here;
    // fall back to resuming on the next interaction anywhere on the page,
    // rather than forcing the user to re-click an already-"on" toggle.
    const resume = () => { audio.play().catch(() => {}); };
    audio.play().catch(() => {
      document.addEventListener("pointerdown", resume, { once: true });
    });

    return () => document.removeEventListener("pointerdown", resume);
  }, [on]);

  function toggle() {
    setOn((prev) => {
      const next = !prev;
      sessionStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  return (
    <>
      <audio ref={audioRef} src="/sounds/ambient-cave.mp3" loop />
      <button
        onClick={toggle}
        aria-label={on ? "Mute ambient sound" : "Play ambient sound"}
        aria-pressed={on}
        className="bin-icon fixed bottom-6 left-6 z-40 cursor-pointer hover:brightness-125 transition"
        style={{ color: on ? "#fff2c4" : "#b8a988" }}
      >
        {on ? <IconSpeakerOn /> : <IconSpeakerOff />}
      </button>
    </>
  );
}
