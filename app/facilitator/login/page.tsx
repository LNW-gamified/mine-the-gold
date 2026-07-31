"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HeroBackground from "@/components/HeroBackground";

export default function FacilitatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/facilitator");
    router.refresh();
  }

  return (
    <main className="flex-1 relative flex items-center justify-center px-6">
      <HeroBackground />
      <form onSubmit={handleSubmit} className="ore-card-subtle p-8 w-full max-w-sm relative z-10" style={{ borderTopColor: "var(--gold)" }}>
        <h1 className="text-2xl font-bold mb-1">Facilitator login</h1>
        <p className="text-text-dim text-sm mb-6">Sign in to create and run sessions.</p>

        <label className="block text-sm mb-1 text-text-dim">Email</label>
        <input
          type="email"
          className="w-full mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />

        <label className="block text-sm mb-1 text-text-dim">Password</label>
        <input
          type="password"
          className="w-full mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-wildcard text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading || !email || !password} className="btn btn-gold w-full">
          {loading ? "Checking..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
