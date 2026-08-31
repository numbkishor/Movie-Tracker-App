import { Wordmark } from "@/components/nav/wordmark";
import { TmdbAttribution } from "@/components/tmdb-attribution";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-12">
      <Wordmark />

      <div className="w-full max-w-sm rounded-glass-lg border border-glass-border bg-bg-2 p-6 sm:p-7">
        {children}
      </div>

      <TmdbAttribution />
    </main>
  );
}
