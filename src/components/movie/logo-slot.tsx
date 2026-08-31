import Image from "next/image";

import { tmdbImageUrl } from "@/lib/tmdb-image";

/**
 * The rounded-square glass panel that straddles the backdrop/body boundary.
 * When TMDB has no logo this renders the empty state — there is deliberately no
 * upload control here, and adding one is an explicit product decision to
 * reverse first (docs/prd.md).
 */
export function LogoSlot({ title, logoPath }: { title: string; logoPath: string | null }) {
  const logo = tmdbImageUrl(logoPath, "w300");

  return (
    <div className="glass-strong flex h-20 w-20 items-center justify-center rounded-glass p-3 sm:h-24 sm:w-24">
      {logo ? (
        <Image
          src={logo}
          alt={`${title} logo`}
          width={96}
          height={96}
          className="max-h-full w-auto object-contain"
          unoptimized
        />
      ) : (
        <span aria-hidden="true" className="font-display text-subhead font-medium text-text-muted">
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
