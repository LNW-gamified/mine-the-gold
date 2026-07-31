"use client";

import Link from "next/link";
import HeroBackground from "@/components/HeroBackground";
import { playTrack } from "@/lib/audioManager";

export default function Home() {
  return (
    <main className="flex-1 relative flex flex-col">
      <HeroBackground />

      <div className="relative z-10 flex justify-end px-6 py-6">
        <Link href="/facilitator" className="text-xs text-text-dim uppercase tracking-widest hover:text-text transition">
          Run a session
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <div className="max-w-xl w-full text-center">
          <p className="kicker text-center">Into the Mine &middot; Discovery Challenge</p>
          <h1 className="hero-title text-5xl mb-4">Mine the Gold</h1>
          <p className="text-text-dim text-lg mb-10 leading-relaxed">
            Somewhere beneath the surface lies the gold: the business impact and
            compelling reason a prospect needs to change. Dig past the surface.
            Most reps pan for gold. Elite reps mine for it.
          </p>
          <Link
            href="/join"
            onClick={() => playTrack("/sounds/team-song.mp3", { loop: true, volume: 0.4 })}
            className="btn btn-gold inline-flex px-10 py-4 text-base"
          >
            Start Digging
          </Link>
        </div>
      </div>
    </main>
  );
}
