import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Following @supabase/ssr's documented Next.js session-refresh pattern:
// create a response bound to the request, let the Supabase client read/
// write cookies through it, then use getClaims() (not getSession()) since
// that's what actually revalidates the JWT signature on every request
// rather than trusting a possibly-stale/spoofed cookie.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not run code between createServerClient and getClaims() - a simple
  // mistake here can make it very hard to debug users being randomly
  // logged out.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && request.nextUrl.pathname !== "/facilitator/login") {
    return NextResponse.redirect(new URL("/facilitator/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/facilitator/:path*"],
};
