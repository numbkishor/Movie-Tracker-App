export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="sr-only">Loading</span>
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-glass-border border-t-accent"
      />
    </div>
  );
}
