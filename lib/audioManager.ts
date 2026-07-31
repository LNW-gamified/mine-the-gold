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
  notify();
}

export function getLastTrack() {
  return lastTrack;
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
// currentAudio/currentSrc at all. Deliberately no pause/stop/mute wiring or
// AudioToggle integration - it's short-lived (plays once to completion, the
// element is just garbage collected) and the mute toggle only ever controls
// the looping music channel.
export function playVoiceover(
  src: string,
  { volume = 0.9, onEnded }: { volume?: number; onEnded?: () => void } = {}
) {
  if (typeof window === "undefined") return;
  const audio = new Audio(src);
  audio.loop = false;
  audio.volume = volume;
  if (onEnded) audio.addEventListener("ended", onEnded);
  audio.play().catch(() => {});
}
