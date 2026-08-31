import { NextResponse } from "next/server";

import { getSimilarTitles } from "@/lib/tmdb";
import { isMediaType } from "@/lib/tmdb-types";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/** TMDB's similar-titles lookup. Presented in the UI as exactly that. */
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

  if (!rateLimit(`tmdb-similar:${user.id}`, { limit: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { media, id } = await params;
  const tmdbId = Number.parseInt(id, 10);

  if (!isMediaType(media) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid title." }, { status: 400 });
  }

  try {
    const results = await getSimilarTitles(media, tmdbId);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB similar lookup failed", error);
    return NextResponse.json({ error: "Could not load similar titles." }, { status: 502 });
  }
}
