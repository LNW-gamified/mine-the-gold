import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 strata">
      <div className="max-w-xl w-full text-center py-16">
        <p className="text-text-dim uppercase tracking-[0.2em] text-xs mb-4">
          Into the Mine &middot; Discovery Challenge
        </p>
        <h1 className="text-5xl font-bold text-nugget mb-4">Mine the Gold</h1>
        <p className="text-text-dim text-lg mb-12 leading-relaxed">
          Somewhere beneath the surface lies the gold: the business impact and
          compelling reason a prospect needs to change. Dig past the surface.
          Most reps pan for gold. Elite reps mine for it.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/join" className="ore-card-subtle p-6 text-left hover:brightness-110 transition" style={{ borderTopColor: "var(--gold)" }}>
            <h2 className="text-xl font-bold text-text mb-1">Join as a team</h2>
            <p className="text-text-dim text-sm">
              Have a room code from your facilitator? Enter it and start digging.
            </p>
          </Link>

          <Link href="/facilitator" className="ore-card-subtle p-6 text-left hover:brightness-110 transition" style={{ borderTopColor: "var(--rock)" }}>
            <h2 className="text-xl font-bold text-text mb-1">Run a session</h2>
            <p className="text-text-dim text-sm">
              Facilitators: create a room, control rounds, and score teams live.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
