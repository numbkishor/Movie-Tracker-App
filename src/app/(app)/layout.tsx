import { redirect } from "next/navigation";

import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { SiteNav } from "@/components/nav/site-nav";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { requireProfile } from "@/lib/auth";

/**
 * Shell for every signed-in screen. The middleware already redirects signed-out
 * visitors; this check is the one that actually matters, because it runs where
 * the data is read.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  if (!profile) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ServiceWorkerRegistrar />
      <SiteNav profile={profile} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>

      <footer className="border-t border-glass-border px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
          <TmdbAttribution />
        </div>
      </footer>
    </div>
  );
}
