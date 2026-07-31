import { createBrowserClient } from "@supabase/ssr";

// Auth-only client for the facilitator login flow, following @supabase/ssr's
// cookie-based session pattern. This is separate from lib/supabase.ts (the
// plain client used everywhere else for game data/realtime) because that
// one doesn't manage auth cookies - createBrowserClient already singletons
// internally, so calling this repeatedly is cheap.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
