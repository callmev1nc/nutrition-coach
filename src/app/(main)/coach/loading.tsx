export default function Loading() {
  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="flex-1 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-16 animate-pulse rounded-xl bg-muted ${i % 2 === 0 ? 'w-3/4' : 'w-2/3 ml-auto'}`} />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
