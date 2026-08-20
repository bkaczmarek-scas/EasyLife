import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

export function YearSelector({ year, onChange }: { year: number; onChange: (updater: (year: number) => number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange((y) => y - 1)} className="rounded-md p-1.5 hover:bg-canvas">
        <IconChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold text-text-primary">Year {year}</span>
      <button type="button" onClick={() => onChange((y) => y + 1)} className="rounded-md p-1.5 hover:bg-canvas">
        <IconChevronRight size={16} />
      </button>
    </div>
  )
}
