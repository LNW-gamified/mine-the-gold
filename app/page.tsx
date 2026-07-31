import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex-1 relative flex flex-col">
      <Image
        src="/mine-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(11,9,6,0.75) 0%, rgba(11,9,6,0.55) 40%, rgba(11,9,6,0.85) 100%)",
        }}
      />

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
          <Link href="/join" className="btn btn-gold inline-flex px-10 py-4 text-base">
            Join as a team
          </Link>
        </div>
      </div>
    </main>
  );
}
