import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { listFriendships, searchProfiles } from "@/lib/friends";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Username lookup for the add-friend box.
 *
 * Only signed-in users can reach it, and it returns profile fields only — never
 * anything about what a person has watched. People you are already connected to
 * (friends, pending either way, blocked) are removed, so every result is
 * actionable.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!rateLimit(`people-search:${user.id}`, { limit: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [results, friendships] = await Promise.all([
    searchProfiles(query, user.id),
    listFriendships(user.id),
  ]);

  const connected = new Set(friendships.map((friendship) => friendship.other.id));

  return NextResponse.json({
    results: results.filter((profile) => !connected.has(profile.id)),
  });
}
