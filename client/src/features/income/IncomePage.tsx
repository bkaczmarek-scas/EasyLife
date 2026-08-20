import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card, StatTile } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useDeleteBonus, type Bonus } from '../../api/resources/bonuses'
import { useYearlyIncome } from './useYearlyIncome'
import { BonusFormDialog } from './BonusFormDialog'

export function IncomePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { months, yearBonuses, totalNet, totalBonuses, totalCombined, isLoading } = useYearlyIncome(year)
  const deleteBonus = useDeleteBonus()
  const toast = useToast()

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

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Income Tracking &amp; Breakdown</h1>
          <p className="mt-1 text-sm text-text-secondary">Detailed salary accounting structure and bonus distributions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary">{year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading…</p>
      ) : (
        <>
          <Card className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-text-muted">Total YTD Retribution (Salary + Bonuses)</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">{totalCombined.toFixed(2)} PLN</p>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <p className="text-xs text-text-muted">Salary Component</p>
                <p className="font-semibold text-text-primary">{totalNet.toFixed(2)} PLN</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Bonus Component</p>
                <p className="font-semibold text-primary">{totalBonuses.toFixed(2)} PLN</p>
              </div>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <Card className="!p-0">
              <p className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">Monthly Salary Breakdown</p>
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
                    <th className="px-4 py-2">Month</th>
                    <th className="py-2">Gross</th>
                    <th className="py-2">ZUS</th>
                    <th className="py-2">Tax</th>
                    <th className="py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-semibold text-text-primary">{m.label} {year}</td>
                      <td className="py-3 text-text-secondary">{m.gross.toFixed(2)}</td>
                      <td className="py-3 text-text-secondary">{m.zus.toFixed(2)}</td>
                      <td className="py-3 text-text-secondary">{m.tax.toFixed(2)}</td>
                      <td className="py-3 font-semibold text-primary">{m.net.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="!p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">Bonuses &amp; Additions</p>
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <IconPlus size={14} /> Add Record
                </Button>
              </div>
              <div className="p-4">
                <StatTile eyebrow="Total Bonus Yield" value={`${totalBonuses.toFixed(2)} PLN`} className="mb-3" />
                <div className="flex flex-col gap-2">
                  {yearBonuses.map((b) => (
                    <div key={b.id} className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{b.name}</p>
                        <p className="text-xs text-text-muted">{b.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{b.amount.toFixed(2)} PLN</span>
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
              </div>
            </Card>
          </div>
        </>
      )}

      <BonusFormDialog open={formOpen} onOpenChange={setFormOpen} bonus={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete record?"
        description={deleting ? `"${deleting.name}" will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteBonus.isPending}
      />
    </div>
  )
}
