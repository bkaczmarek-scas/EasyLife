import { useMemo } from 'react'
import { useRates } from '../../api/resources/rates'
import { useYearWorklogs } from '../../api/resources/worklogs'
import { useCosts } from '../../api/resources/costs'
import { useBonuses } from '../../api/resources/bonuses'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function rateForMonth(rates: Array<{ from: string; rate: number }>, year: number, month: number) {
  const key = `${year}-${String(month).padStart(2, '0')}`
  const sorted = [...rates].sort((a, b) => a.from.localeCompare(b.from))
  if (!sorted.length) return 0
  let applicable = sorted[0].rate
  for (const entry of sorted) {
    if (entry.from <= key) applicable = entry.rate
    else break
  }
  return applicable
}

export function useYearlyIncome(year: number) {
  const { data: rates } = useRates()
  const { data: costs } = useCosts()
  const { data: bonuses } = useBonuses()
  const { byMonth: worklogsByMonth, isLoading: worklogsLoading } = useYearWorklogs(year)

  const isLoading = worklogsLoading || !rates || !costs || !bonuses

  const months = useMemo(() => {
    if (!rates || !costs) return []
    return worklogsByMonth.map(({ month, totalHours }) => {
      const rate = rateForMonth(rates, year, month)
      const gross = Math.round(totalHours * rate)
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      const cost = costs.find((c) => c.month === monthKey)
      const zus = cost?.zus ?? 0
      const tax = cost?.tax ?? 0
      const accounting = cost?.accounting ?? 0
      const net = gross - zus - tax - accounting
      return { month, label: MONTH_NAMES[month - 1], totalHours, rate, gross, zus, tax, accounting, net }
    })
  }, [rates, costs, worklogsByMonth, year])

  const yearBonuses = useMemo(
    () => (bonuses ?? []).filter((b) => b.date.startsWith(String(year))),
    [bonuses, year]
  )

  const totalNet = months.reduce((sum, m) => sum + m.net, 0)
  const totalBonuses = yearBonuses.reduce((sum, b) => sum + b.amount, 0)

  return { months, yearBonuses, totalNet, totalBonuses, totalCombined: totalNet + totalBonuses, isLoading }
}
