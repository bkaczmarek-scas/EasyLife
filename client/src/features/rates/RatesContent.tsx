import { useMemo, useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconPercentage } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useRates, useDeleteRate, type Rate } from '../../api/resources/rates'
import { RateFormDialog } from './RateFormDialog'

export function formatPeriodLabel(from: string) {
  const [year, month] = from.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function RatesContent() {
  const { data: rates, isLoading } = useRates()
  const deleteRate = useDeleteRate()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<Rate | null>(null)
  const [deletingRate, setDeletingRate] = useState<Rate | null>(null)

  const sorted = useMemo(() => [...(rates ?? [])].sort((a, b) => b.from.localeCompare(a.from)), [rates])
  const current = sorted[0]
  const previous = sorted[1]
  const change = current && previous ? ((current.rate - previous.rate) / previous.rate) * 100 : null

  async function handleDelete() {
    if (!deletingRate) return
    try {
      await deleteRate.mutateAsync(deletingRate.id)
      toast.show('Rate removed')
      setDeletingRate(null)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to delete rate', 'error')
    }
  }

  if (isLoading) return <p className="mt-6 text-sm text-text-secondary">Loading…</p>

  if (!rates || rates.length === 0) {
    return (
      <div>
        <Card className="mt-6 flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <IconPercentage size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">No rates configured</h2>
          <p className="max-w-xs text-sm text-text-secondary">
            Set your hourly rate to start tracking income and generating invoices.
          </p>
          <Button
            className="mt-2"
            onClick={() => {
              setEditingRate(null)
              setFormOpen(true)
            }}
          >
            Set Your First Rate
          </Button>
        </Card>
        <RateFormDialog open={formOpen} onOpenChange={setFormOpen} rate={editingRate} />
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between">
        <p className="text-sm text-text-secondary">Configure rates progression and billing structures.</p>
        <Button
          onClick={() => {
            setEditingRate(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add New Rate Option
        </Button>
      </div>

      <Card className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-text-muted">Current Contract Value</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl font-bold text-text-primary">{current.rate.toFixed(2)} PLN / hr</span>
            {change !== null && (
              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}% {change >= 0 ? 'increase' : 'decrease'}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Effective date: <span className="font-semibold text-text-primary">{formatPeriodLabel(current.from)}</span>
        </p>
      </Card>

      <Card className="mt-6 !p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">Rate Progression History</p>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
              <th className="px-4 py-2">Period</th>
              <th className="py-2">Rate</th>
              <th className="w-16 py-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((rate, i) => (
              <tr key={rate.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-text-primary">
                  {i === 0 ? `Since ${formatPeriodLabel(rate.from)}` : formatPeriodLabel(rate.from)}
                </td>
                <td className="py-3 text-text-secondary">{rate.rate.toFixed(2)} PLN/h</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => {
                        setEditingRate(rate)
                        setFormOpen(true)
                      }}
                      className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setDeletingRate(rate)}
                      className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <RateFormDialog open={formOpen} onOpenChange={setFormOpen} rate={editingRate} />
      <ConfirmDialog
        open={Boolean(deletingRate)}
        onOpenChange={(open) => !open && setDeletingRate(null)}
        title="Delete historical rate record?"
        description={
          deletingRate
            ? `${deletingRate.rate.toFixed(2)} PLN/hr (from ${formatPeriodLabel(deletingRate.from)}) will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete Permanently"
        onConfirm={handleDelete}
        pending={deleteRate.isPending}
      />
    </div>
  )
}
