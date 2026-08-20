import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Compensation</h1>
          <p className="mt-1 text-sm text-text-secondary">Track working hours, active contract rates, and detailed historical compensation.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 hover:bg-canvas">
              <IconChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-text-primary">Year {year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-md p-1.5 hover:bg-canvas">
              <IconChevronRight size={16} />
            </button>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <IconDownload size={14} /> Export CSV
          </Button>
        </div>
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

      {tab === 'income' && <IncomeContent year={year} />}
      {tab === 'hours' && <HoursContent year={year} />}
    </div>
  )
}
