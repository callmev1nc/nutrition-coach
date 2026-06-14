export default function Loading() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-16 flex-col border-r bg-card p-3 gap-4">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-lg bg-muted" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="mx-auto h-8 w-8 animate-pulse rounded-lg bg-muted" />
        ))}
      </aside>
      <main className="flex-1 p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </main>
    </div>
  )
}
