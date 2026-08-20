import { useState } from 'react'
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Sheet } from '../../components/ui/Sheet'
import { YearSelector } from '../../components/ui/YearSelector'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useDeleteBonus, type Bonus } from '../../api/resources/bonuses'
import { useUpsertCost } from '../../api/resources/costs'
import { formatMoney, formatPLN } from '../../lib/money'
import { useYearlyIncome } from './useYearlyIncome'
import { BonusFormDialog } from './BonusFormDialog'
import { RatesContent } from '../rates/RatesContent'

function CostInput({ value, onCommit }: { value: number; onCommit: (next: number) => void }) {
  return (
    <input
      key={value}
      type="number"
      step="0.01"
      defaultValue={value}
      onBlur={(e) => {
        const next = Number(e.target.value)
        if (!Number.isNaN(next) && next !== value) onCommit(next)
      }}
      className="w-24 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-text-secondary hover:border-border focus:border-primary focus:bg-surface-0 focus:outline-none"
    />
  )
}

export function IncomeContent({
  year,
  onYearChange,
}: {
  year: number
  onYearChange: (updater: (year: number) => number) => void
}) {
  const { months, yearBonuses, totalNet, totalBonuses, totalCombined, isLoading } = useYearlyIncome(year)
  const deleteBonus = useDeleteBonus()
  const upsertCost = useUpsertCost()
  const toast = useToast()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bonus | null>(null)
  const [deleting, setDeleting] = useState<Bonus | null>(null)

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteBonus.mutateAsync(deleting.id)
      toast.show('Record removed')
      setDeleting(null)
    } catch {
      toast.show('Failed to delete record', 'error')
    }
  }

  async function handleCostChange(
    monthNum: number,
    current: { zus: number; tax: number; accounting: number },
    field: 'zus' | 'tax' | 'accounting',
    next: number
  ) {
    try {
      await upsertCost.mutateAsync({ month: `${year}-${String(monthNum).padStart(2, '0')}`, ...current, [field]: next })
    } catch {
      toast.show('Failed to update cost', 'error')
    }
  }

  if (isLoading) return <p className="mt-6 text-sm text-text-secondary">Loading…</p>

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-6">
        <Card>
          <p className="text-xs font-semibold uppercase text-text-muted">Total YTD Retribution (Salary + Bonuses)</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{formatPLN(totalCombined)}</p>
          <div className="mt-3 flex gap-8">
            <div>
              <p className="text-xs text-text-muted">Salary Component</p>
              <p className="font-semibold text-text-primary">{formatPLN(totalNet)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Bonus Component</p>
              <p className="font-semibold text-primary">{formatPLN(totalBonuses)}</p>
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer hover:border-primary" onClick={() => setDetailsOpen(true)}>
          <p className="text-xs font-semibold uppercase text-text-muted">Total Bonus Yield</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatPLN(totalBonuses)}</p>
          <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {yearBonuses.length} record{yearBonuses.length === 1 ? '' : 's'} registered
          </span>
        </Card>

        <RatesContent />
      </div>

      <Card className="mt-6 !p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-base font-semibold text-text-primary">Monthly Salary Breakdown</p>
          <YearSelector year={year} onChange={onYearChange} />
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
              <th className="px-5 py-3">Month</th>
              <th className="px-3 py-3 text-right">Gross</th>
              <th className="px-3 py-3 text-right">ZUS</th>
              <th className="px-3 py-3 text-right">Tax</th>
              <th className="px-3 py-3 text-right">Accounting</th>
              <th className="px-5 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const current = { zus: m.zus, tax: m.tax, accounting: m.accounting }
              return (
                <tr key={m.month} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-semibold text-text-primary">{m.label} {year}</td>
                  <td className="px-3 py-3.5 text-right text-text-secondary">{formatMoney(m.gross)}</td>
                  <td className="px-1 py-1.5 text-right">
                    <CostInput value={m.zus} onCommit={(next) => handleCostChange(m.month, current, 'zus', next)} />
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <CostInput value={m.tax} onCommit={(next) => handleCostChange(m.month, current, 'tax', next)} />
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <CostInput value={m.accounting} onCommit={(next) => handleCostChange(m.month, current, 'accounting', next)} />
                  </td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${m.net >= 0 ? 'text-green-700' : 'text-danger-text'}`}>
                    {formatPLN(m.net)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen} title="Bonuses & Additions">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-text-secondary">Manage bonus and additional compensation records.</p>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <IconPlus size={14} /> Add Record
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {yearBonuses.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">{b.name}</p>
                <p className="text-xs text-text-muted">{b.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{formatPLN(b.amount)}</span>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(b)
                    setFormOpen(true)
                  }}
                  className="rounded-md p-1 text-text-muted hover:bg-canvas hover:text-text-primary"
                >
                  <IconEdit size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setDeleting(b)}
                  className="rounded-md p-1 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))}
          {yearBonuses.length === 0 && <p className="text-sm text-text-secondary">No bonuses added.</p>}
        </div>
      </Sheet>

      <BonusFormDialog open={formOpen} onOpenChange={setFormOpen} bonus={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete record?"
        description={deleting ? `"${deleting.name}" will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteBonus.isPending}
      />
    </>
  )
}
