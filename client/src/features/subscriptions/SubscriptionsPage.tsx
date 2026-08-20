import { useMemo, useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconCalendar, IconRepeat } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card, StatTile } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useSubscriptions, useDeleteSubscription, type Subscription } from '../../api/resources/subscriptions'
import { SubscriptionFormDialog } from './SubscriptionFormDialog'
import { dateUrgency } from '../../lib/dateUrgency'

function monthlyEquivalent(sub: Subscription) {
  return sub.billingCycle === 'yearly' ? sub.cost / 12 : sub.cost
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export function SubscriptionsPage() {
  const { data: subscriptions, isLoading } = useSubscriptions()
  const deleteSub = useDeleteSubscription()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)

  const stats = useMemo(() => {
    const list = subscriptions ?? []
    const monthly = list.reduce((sum, s) => sum + monthlyEquivalent(s), 0)
    return { monthly, count: list.length, annual: monthly * 12 }
  }, [subscriptions])

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteSub.mutateAsync(deleting.id)
      toast.show('Subscription removed')
      setDeleting(null)
    } catch {
      toast.show('Failed to delete subscription', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Subscriptions Tracker</h1>
          <p className="mt-1 text-sm text-text-secondary">Review and track your repeating payments and digital tools.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add Subscription
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading…</p>
      ) : !subscriptions || subscriptions.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <IconCalendar size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">No subscriptions yet</h2>
          <p className="max-w-xs text-sm text-text-secondary">Track your recurring subscriptions to stay on top of renewals and spending.</p>
          <Button
            className="mt-2"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add Your First Subscription
          </Button>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <StatTile eyebrow="Monthly Estimated Spend" value={`${stats.monthly.toFixed(2)} PLN`} />
            <StatTile eyebrow="Active Subscriptions" value={`${stats.count} Services`} />
            <StatTile eyebrow="Projected Annual Cost" value={`${stats.annual.toFixed(0)} PLN`} />
          </div>

          <div className="mt-6 grid grid-cols-4 gap-4">
            {subscriptions.map((sub) => {
              const renewal = dateUrgency(sub.nextRenewalDate)
              const unusedDays = daysSince(sub.lastUsedDate)
              const isUnused = unusedDays !== null && unusedDays > 90
              return (
                <Card key={sub.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <IconRepeat size={18} className="text-primary" />
                    </div>
                    {sub.category && <Badge tone="info">{sub.category}</Badge>}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{sub.name}</p>
                    <p className="text-lg font-bold text-text-primary">
                      {sub.cost.toFixed(2)} PLN <span className="text-xs font-normal text-text-muted">/ {sub.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </p>
                  </div>
                  <div className="border-t border-border pt-2 text-xs">
                    {isUnused ? (
                      <Badge tone="danger">Unused {unusedDays}d</Badge>
                    ) : (
                      <>
                        <p className="flex items-center gap-1 text-text-secondary">
                          {sub.autoRenew && <IconRepeat size={12} />} {sub.autoRenew ? 'Auto-renew' : 'Manual renewal'}
                        </p>
                        <p className={renewal.tone === 'danger' || renewal.tone === 'warning' ? 'font-semibold text-warning-text' : 'text-text-muted'}>
                          {renewal.label === 'Overdue' ? 'Renewal overdue' : renewal.label === 'Valid' ? `Renews ${sub.nextRenewalDate}` : `Renews in ${renewal.label}`}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(sub)
                        setFormOpen(true)
                      }}
                      className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setDeleting(sub)}
                      className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <SubscriptionFormDialog open={formOpen} onOpenChange={setFormOpen} subscription={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete subscription?"
        description={deleting ? `"${deleting.name}" will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteSub.isPending}
      />
    </div>
  )
}
