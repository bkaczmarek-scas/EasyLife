import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useTaxPayments, useDeleteTaxPayment, type TaxPayment } from '../../api/resources/taxPayments'
import { TaxPaymentFormDialog } from './TaxPaymentFormDialog'

export function TaxLedger() {
  const { data: payments } = useTaxPayments()
  const deletePayment = useDeleteTaxPayment()
  const toast = useToast()

  const [year, setYear] = useState(new Date().getFullYear())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaxPayment | null>(null)
  const [deleting, setDeleting] = useState<TaxPayment | null>(null)

  const yearPayments = useMemo(
    () => (payments ?? []).filter((p) => p.period.startsWith(String(year))).sort((a, b) => a.period.localeCompare(b.period)),
    [payments, year]
  )
  const totalYtd = yearPayments.reduce((sum, p) => sum + p.amount, 0)

  async function handleDelete() {
    if (!deleting) return
    try {
      await deletePayment.mutateAsync(deleting.id)
      toast.show('Payment removed')
      setDeleting(null)
    } catch {
      toast.show('Failed to delete payment', 'error')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary">{year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronRight size={16} />
          </button>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add Payment
        </Button>
      </div>

      <Card className="!p-0">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
              <th className="px-4 py-2">Month</th>
              <th className="py-2">Sienkiewicza</th>
              <th className="py-2">Szczęśliwa</th>
              <th className="py-2">Total</th>
              <th className="py-2">Transfer Date</th>
              <th className="w-16 py-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {yearPayments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-text-primary">{p.period}</td>
                <td className="py-3 text-text-secondary">{p.sienkiewicza != null ? `${p.sienkiewicza} PLN` : '—'}</td>
                <td className="py-3 text-text-secondary">{p.szczesliwa != null ? `${p.szczesliwa} PLN` : '—'}</td>
                <td className="py-3 font-semibold text-text-primary">{p.amount} PLN</td>
                <td className="py-3 text-text-secondary">{p.transferDate ?? '—'}</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(p)
                        setFormOpen(true)
                      }}
                      className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setDeleting(p)}
                      className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {yearPayments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                  No tax payments recorded for {year}.
                </td>
              </tr>
            )}
          </tbody>
          {yearPayments.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-canvas font-semibold text-text-primary">
                <td className="px-4 py-3">Total ({year})</td>
                <td colSpan={2} />
                <td className="py-3">{totalYtd} PLN</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <TaxPaymentFormDialog open={formOpen} onOpenChange={setFormOpen} payment={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete tax payment?"
        description={deleting ? `Payment for ${deleting.period} will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deletePayment.isPending}
      />
    </div>
  )
}
