import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useCreateSubscription, useUpdateSubscription, type Subscription } from '../../api/resources/subscriptions'
import { useToast } from '../../components/ui/Toast'

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  subscription,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
}) {
  const createSub = useCreateSubscription()
  const updateSub = useUpdateSubscription()
  const toast = useToast()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [cost, setCost] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [nextRenewalDate, setNextRenewalDate] = useState('')
  const [autoRenew, setAutoRenew] = useState(true)
  const [lastUsedDate, setLastUsedDate] = useState('')

  useEffect(() => {
    if (!open) return
    setName(subscription?.name ?? '')
    setCategory(subscription?.category ?? '')
    setCost(subscription ? String(subscription.cost) : '')
    setBillingCycle(subscription?.billingCycle ?? 'monthly')
    setNextRenewalDate(subscription?.nextRenewalDate ?? '')
    setAutoRenew(subscription?.autoRenew ?? true)
    setLastUsedDate(subscription?.lastUsedDate ?? '')
  }, [open, subscription])

  const pending = createSub.isPending || updateSub.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const input = {
      name: name.trim(),
      category,
      cost: Number(cost) || 0,
      billingCycle,
      nextRenewalDate: nextRenewalDate || null,
      autoRenew,
      lastUsedDate: lastUsedDate || null,
    }
    try {
      if (subscription) {
        await updateSub.mutateAsync({ id: subscription.id, ...input })
        toast.show('Subscription updated')
      } else {
        await createSub.mutateAsync(input)
        toast.show('Subscription added')
      }
      onOpenChange(false)
    } catch {
      toast.show('Failed to save subscription', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={subscription ? 'Edit Subscription' : 'Add Subscription'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-name">Name</Label>
          <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-category">Category</Label>
          <Input id="sub-category" placeholder="e.g. Entertainment" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-cost">Cost (zł)</Label>
            <Input id="sub-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Billing Cycle</Label>
            <Select
              value={billingCycle}
              onChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-renewal">Next Renewal Date</Label>
          <Input id="sub-renewal" type="date" value={nextRenewalDate} onChange={(e) => setNextRenewalDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-last-used">Last Used Date</Label>
          <Input id="sub-last-used" type="date" value={lastUsedDate} onChange={(e) => setLastUsedDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="accent-primary" />
          Auto-renew
        </label>
        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save Subscription'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
