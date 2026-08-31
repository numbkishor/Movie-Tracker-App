import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { readPublicSupabaseEnv } from "@/lib/supabase/env";

/** Routes a signed-out visitor may reach. Everything else redirects to sign-in. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and keeps signed-out
 * visitors out of the app. RLS is still the real boundary — this is just so a
 * logged-out visitor gets a sign-in page instead of an empty screen.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = readPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), not getSession(): it revalidates the token with Supabase rather
  // than trusting a cookie the browser could have tampered with.
  //
  // If Supabase is unreachable this treats the request as signed out, which
  // fails toward the sign-in page rather than toward letting someone through.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("Could not verify the session with Supabase", error);
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";

    // Only a same-site path is ever echoed back, so this cannot be turned into
    // an open redirect by a crafted link.
    if (pathname !== "/") {
      signInUrl.searchParams.set("next", pathname);
    }

    return NextResponse.redirect(signInUrl);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
