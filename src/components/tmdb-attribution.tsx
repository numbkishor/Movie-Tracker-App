/**
 * Required by TMDB's terms of use, not decoration — see docs/security.md.
 * Do not remove it to tidy up a layout.
 */
export function TmdbAttribution({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-meta text-text-muted"}>
      This product uses the TMDB API but is not endorsed or certified by TMDb.
    </p>
  );
}
