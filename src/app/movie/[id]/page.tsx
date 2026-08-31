import { permanentRedirect } from "next/navigation";

/**
 * Titles moved to /title/<media>/<id> when series support arrived and a bare
 * TMDB id stopped being unique. Old links — including anything already shared
 * with a friend — still resolve.
 */
export default async function LegacyMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/title/movie/${id}`);
}
