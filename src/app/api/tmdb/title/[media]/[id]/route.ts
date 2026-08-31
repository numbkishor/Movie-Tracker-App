import { NextResponse } from "next/server";

import { getTitleDetail } from "@/lib/tmdb";
import { isMediaType } from "@/lib/tmdb-types";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Detail proxy. Server Components read the same data by calling
 * `getTitleDetail` directly — both paths go through the one mapper in
 * lib/tmdb.ts, and neither exposes the key. This route exists for
 * browser-originated fetches.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ media: string; id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!rateLimit(`tmdb-detail:${user.id}`, { limit: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { media, id } = await params;
  const tmdbId = Number.parseInt(id, 10);

  if (!isMediaType(media) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid title." }, { status: 400 });
  }

  try {
    const title = await getTitleDetail(media, tmdbId);
    return NextResponse.json({ title });
  } catch (error) {
    console.error("TMDB detail failed", error);
    return NextResponse.json({ error: "Could not load this title from TMDB." }, { status: 502 });
  }
}
