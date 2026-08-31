import { NextResponse, type NextRequest } from "next/server";

import { searchTitles, TmdbError } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Search proxy for the client-side search box. Films and series together since
 * Phase 3. The TMDB key stays in this process; the browser only ever sees the
 * mapped results.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sign-in required so this route can't be used as an anonymous free proxy
  // onto our rate-limited TMDB key.
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!rateLimit(`tmdb-search:${user.id}`, { limit: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  if (query.length > 120) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  try {
    const results = await searchTitles(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: describeTmdbFailure(error) }, { status: 502 });
  }
}

function describeTmdbFailure(error: unknown): string {
  // The message is logged in full but never returned: TMDB error bodies can
  // echo the request URL, and the API key with it.
  console.error("TMDB search failed", error);
  return error instanceof TmdbError && error.status === 500
    ? "TMDB is not configured on the server."
    : "Could not reach TMDB. Try again in a moment.";
}
