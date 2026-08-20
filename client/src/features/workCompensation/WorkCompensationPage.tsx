import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { downloadCsv } from '../../lib/csv'
import { HoursContent, useHoursData, WORKING_HOURS_BY_MONTH } from '../hours/HoursContent'
import { formatPeriodLabel } from '../rates/RatesContent'
import { IncomeContent } from '../income/IncomeContent'
import { useRates } from '../../api/resources/rates'
import { useYearlyIncome } from '../income/useYearlyIncome'

type TabValue = 'hours' | 'income'

export function WorkCompensationPage() {
  const [tab, setTab] = useState<TabValue>('income')
  const [year, setYear] = useState(new Date().getFullYear())

  // Hooks are cheap to call redundantly here — TanStack Query dedupes against the same-keyed
  // queries the tab content components below already fire, so this doesn't double the network cost.
  const { data: rates } = useRates()
  const { byMonth } = useHoursData(year)
  const { months: incomeMonths, yearBonuses } = useYearlyIncome(year)

  function handleExport() {
    if (tab === 'hours') {
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
    } else {
      const rows: Array<Array<string | number>> = [
        ['Month', 'Hours', 'Rate', 'Gross', 'ZUS', 'Tax', 'Accounting', 'Net'],
        ...incomeMonths.map((m) => [`${m.label} ${year}`, m.totalHours, m.rate, m.gross, m.zus, m.tax, m.accounting, m.net]),
        ['Total', '', '', '', '', '', '', incomeMonths.reduce((s, m) => s + m.net, 0)],
        [],
        ['Bonus', 'Date', 'Amount'],
        ...yearBonuses.map((b) => [b.name, b.date, b.amount]),
        [],
        ['Effective from', 'Rate (zł/h)'],
        ...(rates ?? []).map((r) => [formatPeriodLabel(r.from), r.rate]),
      ]
      downloadCsv(`income-${year}.csv`, rows)
    }
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

      {tab === 'income' && <IncomeContent year={year} onYearChange={setYear} onExport={handleExport} />}
      {tab === 'hours' && <HoursContent year={year} onYearChange={setYear} onExport={handleExport} />}
    </div>
  )
}
