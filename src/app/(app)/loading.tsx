/** Shown instantly while the next screen loads, so a tap always feels answered. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-14 animate-pulse rounded-2xl bg-card shadow-soft" />
      <div className="flex gap-2">
        <div className="h-12 w-28 animate-pulse rounded-full bg-card" />
        <div className="h-12 w-40 animate-pulse rounded-full bg-card" />
        <div className="h-12 w-24 animate-pulse rounded-full bg-card" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-3xl bg-card shadow-soft" />
      ))}
    </div>
  );
}
