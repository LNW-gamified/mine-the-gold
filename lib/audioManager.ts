// A simple module-level singleton, not tied to any component's lifecycle.
// This is what lets a track started on one page keep playing after
// navigating to the next (a plain <audio> tag inside a page component
// would be destroyed the moment that page unmounts).

let currentAudio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

// Remembers the most recently requested track/options even after
// stopTrack() clears currentAudio, so a mute toggle elsewhere can restart
// "whatever was playing" without needing to know the track itself. Mirrored
// to localStorage (not just kept in memory) because a hard page reload
// re-executes this module from scratch - without that, the toggle would
// have nothing to restart until a track was started again some other way.
const LAST_TRACK_KEY = "mtg_last_track";

function readLastTrack(): { src: string; opts: { loop: boolean; volume: number } } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_TRACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let lastTrack: { src: string; opts: { loop: boolean; volume: number } } | null = readLastTrack();

// The user's actual mute preference - distinct from "is something playing
// right now". Previously mute was only ever inferred from playback state,
// which meant a hard reload (module reinitializes, currentAudio starts
// null) had no memory of it: every page's mount-time playTrack() call would
// just start audio again regardless of whether the user had muted before
// refreshing. Persisted so that preference survives a reload.
const MUTED_KEY = "mtg_muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = readMuted();

export function isMuted(): boolean {
  return muted;
}

// Lets UI outside the call site (e.g. a mute button mounted in the root
// layout) know playback state changed, since this module has no React
// state of its own to trigger a re-render.
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function onTrackChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function playTrack(
  src: string,
  { loop = true, volume = 0.35 }: { loop?: boolean; volume?: number } = {}
) {
  if (typeof window === "undefined") return;

  lastTrack = { src, opts: { loop, volume } };
  try {
    localStorage.setItem(LAST_TRACK_KEY, JSON.stringify(lastTrack));
  } catch {}

  // Muted: remember what *would* be playing (above) so unmuting resumes
  // the right thing, but don't actually start audio. Every page calls
  // playTrack() unconditionally on mount, so this is the one place that
  // has to enforce the user's mute choice.
  if (muted) {
    stopTrack();
    return;
  }

  // Already playing this exact track, don't restart it from the beginning.
  if (currentSrc === src && currentAudio && !currentAudio.paused) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }

  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  // Browsers can still block this even right after a click in rare cases
  // (e.g. a click that also triggers a synchronous navigation before the
  // promise resolves). Fail silently rather than throwing.
  audio.play().catch(() => {});

  currentAudio = audio;
  currentSrc = src;
  notify();
}

export function stopTrack() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }
  currentAudio = null;
  currentSrc = null;
  stopVoiceover();
  notify();
}

// The user-facing mute toggle: persists the preference (unlike stopTrack,
// which just silences whatever's playing right now without remembering
// why) and, on unmute, resumes whatever was last requested.
export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTED_KEY, next ? "1" : "0");
  } catch {}
  if (next) {
    stopTrack();
  } else if (lastTrack) {
    playTrack(lastTrack.src, lastTrack.opts);
  } else {
    notify();
  }
}

export function setTrackVolume(volume: number) {
  if (currentAudio) currentAudio.volume = volume;
}

export function isTrackPlaying(): boolean {
  return !!currentAudio && !currentAudio.paused;
}

export function getCurrentTrackSrc(): string | null {
  return currentSrc;
}

// A second, independent channel for one-shot voiceover clips that layers on
// top of whatever's playing on the music channel above, without touching
// currentAudio/currentSrc at all - it's short-lived (plays once to
// completion) so there's no isPlaying/currentSrc state for it to keep in
// sync with the music channel. Still tracked well enough to be stoppable
// though: stopTrack() (and so setMuted(true) and any page that calls it on
// mount) also cuts off an in-progress voiceover - otherwise muting or
// navigating away mid-clip left it talking to completion regardless.
let currentVoiceover: HTMLAudioElement | null = null;

export function playVoiceover(
  src: string,
  { volume = 0.9, onEnded }: { volume?: number; onEnded?: () => void } = {}
) {
  if (typeof window === "undefined") return;
  if (muted) {
    onEnded?.();
    return;
  }
  if (currentVoiceover) {
    currentVoiceover.pause();
    currentVoiceover.src = "";
  }
  const audio = new Audio(src);
  audio.loop = false;
  audio.volume = volume;
  audio.addEventListener("ended", () => {
    if (currentVoiceover === audio) currentVoiceover = null;
    onEnded?.();
  });
  audio.play().catch(() => {});
  currentVoiceover = audio;
}

export function stopVoiceover() {
  if (currentVoiceover) {
    currentVoiceover.pause();
    currentVoiceover.src = "";
  }
  currentVoiceover = null;
}
