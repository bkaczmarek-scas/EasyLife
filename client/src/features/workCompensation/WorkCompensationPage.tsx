import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { downloadCsv } from '../../lib/csv'
import { HoursContent, useHoursData, WORKING_HOURS_BY_MONTH } from '../hours/HoursContent'
import { IncomeContent } from '../income/IncomeContent'

type TabValue = 'hours' | 'income'

export function WorkCompensationPage() {
  const [tab, setTab] = useState<TabValue>('income')
  const [year, setYear] = useState(new Date().getFullYear())

  const { byMonth } = useHoursData(year)

  function handleExportHours() {
    downloadCsv(
      `hours-${year}.csv`,
      [
        ['Month', 'Working hours', 'Logged hours'],
        ...byMonth.map(({ month, totalHours }) => [
          String(month).padStart(2, '0') + '.' + year,
          WORKING_HOURS_BY_MONTH[month] ?? 168,
          totalHours,
        ]),
      ]
    )
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Compensation</h1>
        <p className="mt-1 text-sm text-text-secondary">Track working hours, active contract rates, and detailed historical compensation.</p>
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'income', label: 'Income' },
            { value: 'hours', label: 'Hours & Vacation' },
          ]}
        />
      </div>

      {tab === 'income' && <IncomeContent year={year} onYearChange={setYear} />}
      {tab === 'hours' && <HoursContent year={year} onYearChange={setYear} onExport={handleExportHours} />}
    </div>
  )
}
