"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/nav/wordmark";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Wordmark href="/" />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-hero font-bold">That didn&apos;t load</h1>
        {/* The message is logged, not printed — an error string can carry
            internal detail that has no business on screen. */}
        <p className="max-w-sm text-body text-text-secondary">
          Something went wrong on our side. Trying again usually sorts it.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
