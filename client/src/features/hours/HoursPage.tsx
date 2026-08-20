import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Card, StatTile } from '../../components/ui/Card'
import { useYearWorklogs } from '../../api/resources/worklogs'
import { HoursChart } from './HoursChart'

// Standard contracted working hours per calendar month — matches the existing app's fixed
// month->hours table (not year-specific; a simplification the current app already accepts).
const WORKING_HOURS_BY_MONTH: Record<number, number> = {
  1: 160, 2: 160, 3: 176, 4: 168, 5: 160, 6: 168, 7: 184, 8: 160, 9: 176, 10: 176, 11: 160, 12: 160,
}

export function HoursPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { byMonth, isLoading } = useYearWorklogs(year)

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

  const capacity = byMonth.map(({ month }) => WORKING_HOURS_BY_MONTH[month] ?? 168)
  const logged = byMonth.map(({ totalHours }) => totalHours)

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Hours &amp; Vacations Tracker</h1>
          <p className="mt-1 text-sm text-text-secondary">Monitor overall work hours progression and vacation balance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading…</p>
      ) : (
        <>
          <StatTile eyebrow="Vacation Balance" value={`${daysOff.toFixed(1)} Days Off`} className="mt-6" />

          <Card className="mt-6">
            <p className="mb-3 font-semibold text-text-primary">Monthly Worked Hours</p>
            <div className="h-80">
              <HoursChart capacity={capacity} logged={logged} />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
