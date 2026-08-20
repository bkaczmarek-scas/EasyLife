export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">Not built yet — walking-skeleton placeholder.</p>
    </div>
  )
}
