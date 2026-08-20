import { useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconDownload } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Sheet } from '../../components/ui/Sheet'
import { YearSelector } from '../../components/ui/YearSelector'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useDeleteBonus, type Bonus } from '../../api/resources/bonuses'
import { formatMoney, formatPLN } from '../../lib/money'
import { useYearlyIncome } from './useYearlyIncome'
import { BonusFormDialog } from './BonusFormDialog'
import { RatesContent } from '../rates/RatesContent'

export function IncomeContent({
  year,
  onYearChange,
  onExport,
}: {
  year: number
  onYearChange: (year: number) => void
  onExport: () => void
}) {
  const { months, yearBonuses, totalNet, totalBonuses, totalCombined, isLoading } = useYearlyIncome(year)
  const deleteBonus = useDeleteBonus()
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

  if (isLoading) return <p className="mt-6 text-sm text-text-secondary">Loading…</p>

  return (
    <>
      <Card className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-text-muted">Total YTD Retribution (Salary + Bonuses)</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{formatPLN(totalCombined)}</p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-xs text-text-muted">Salary Component</p>
            <p className="font-semibold text-text-primary">{formatPLN(totalNet)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Bonus Component</p>
            <p className="font-semibold text-primary">{formatPLN(totalBonuses)}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-[2fr_1fr] gap-6">
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-base font-semibold text-text-primary">Monthly Salary Breakdown</p>
            <div className="flex items-center gap-3">
              <YearSelector year={year} onChange={onYearChange} />
              <Button variant="secondary" onClick={onExport}>
                <IconDownload size={14} /> Export CSV
              </Button>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
                <th className="px-5 py-3">Month</th>
                <th className="px-3 py-3">Gross</th>
                <th className="px-3 py-3">ZUS</th>
                <th className="px-3 py-3">Tax</th>
                <th className="px-5 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-semibold text-text-primary">{m.label} {year}</td>
                  <td className="px-3 py-3.5 text-text-secondary">{formatMoney(m.gross)}</td>
                  <td className="px-3 py-3.5 text-text-secondary">{formatMoney(m.zus)}</td>
                  <td className="px-3 py-3.5 text-text-secondary">{formatMoney(m.tax)}</td>
                  <td className="px-5 py-3.5 font-semibold text-primary">{formatPLN(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="flex h-full flex-col gap-6">
          <Card
            className="flex flex-1 cursor-pointer items-center justify-between hover:border-primary"
            onClick={() => setDetailsOpen(true)}
          >
            <div>
              <p className="text-xs font-semibold uppercase text-text-muted">Total Bonus Yield</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{formatPLN(totalBonuses)}</p>
            </div>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{yearBonuses.length}</span> record{yearBonuses.length === 1 ? '' : 's'}
            </p>
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

          <RatesContent />
        </div>
      </div>

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
