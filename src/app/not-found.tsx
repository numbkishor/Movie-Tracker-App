import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/nav/wordmark";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Wordmark href="/" />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-hero font-bold">Nothing here</h1>
        <p className="max-w-sm text-body text-text-secondary">
          That page — or that film — doesn&apos;t exist on TMDB.
        </p>
      </div>
      <ButtonLink href="/">Back to your list</ButtonLink>
    </main>
  );
}
