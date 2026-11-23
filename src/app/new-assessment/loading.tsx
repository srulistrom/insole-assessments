/** Instant placeholder while the assessment screen opens. */
export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl" aria-busy="true" aria-label="Loading">
      <div className="h-[76px] bg-primary" />
      <div className="space-y-4 px-4 pt-5">
        <div className="h-5 w-48 animate-pulse rounded-full bg-line" />
        <div className="h-2.5 animate-pulse rounded-full bg-line" />
        <div className="h-10 w-72 animate-pulse rounded-xl bg-card" />
        {[0, 1].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-card shadow-soft" />
        ))}
      </div>
    </div>
  );
}
