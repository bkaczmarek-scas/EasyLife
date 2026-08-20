import { useMemo } from 'react'
import { Card, StatTile } from '../../components/ui/Card'
import { YearSelector } from '../../components/ui/YearSelector'
import { useYearWorklogs } from '../../api/resources/worklogs'
import { cn } from '../../lib/cn'
import { HoursChart } from './HoursChart'

// Standard contracted working hours per calendar month — matches the existing app's fixed
// month->hours table (not year-specific; a simplification the current app already accepts).
export const WORKING_HOURS_BY_MONTH: Record<number, number> = {
  1: 160, 2: 160, 3: 176, 4: 168, 5: 160, 6: 168, 7: 184, 8: 160, 9: 176, 10: 176, 11: 160, 12: 160,
}

export function useHoursData(year: number) {
  const { byMonth, isLoading, isRefreshing } = useYearWorklogs(year)

  const { daysOff } = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    let capacitySum = 0
    let loggedSum = 0
    for (const { month, totalHours } of byMonth) {
      if (year > currentYear || (year === currentYear && month >= currentMonth)) continue
      capacitySum += WORKING_HOURS_BY_MONTH[month] ?? 168
      loggedSum += totalHours
    }
    const unlogged = Math.max(0, capacitySum - loggedSum)
    return { daysOff: unlogged / 8 }
  }, [byMonth, year])

  return { byMonth, isLoading, isRefreshing, daysOff }
}

export function HoursContent({
  year,
  onYearChange,
}: {
  year: number
  onYearChange: (updater: (year: number) => number) => void
}) {
  const { byMonth, isLoading, isRefreshing, daysOff } = useHoursData(year)

  const capacity = byMonth.map(({ month }) => WORKING_HOURS_BY_MONTH[month] ?? 168)
  const logged = byMonth.map(({ totalHours }) => totalHours)

  if (isLoading) return <p className="mt-6 text-sm text-text-secondary">Loading…</p>

  return (
    <div className={cn('transition-opacity duration-300', isRefreshing && 'opacity-50')}>
      <StatTile eyebrow="Vacation Balance" value={`${daysOff.toFixed(1)} Days Off`} className="mt-6" />

      <Card className="mt-6 !p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-base font-semibold text-text-primary">Monthly Worked Hours ({year})</p>
          <YearSelector year={year} onChange={onYearChange} />
        </div>
        <div className="h-80 p-5">
          <HoursChart capacity={capacity} logged={logged} />
        </div>
      </Card>
    </div>
  )
}
