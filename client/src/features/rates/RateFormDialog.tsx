import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { useCreateRate, useUpdateRate, type Rate } from '../../api/resources/rates'
import { useToast } from '../../components/ui/Toast'

export function RateFormDialog({
  open,
  onOpenChange,
  rate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rate: Rate | null
}) {
  const createRate = useCreateRate()
  const updateRate = useUpdateRate()
  const toast = useToast()

  const [from, setFrom] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!open) return
    setFrom(rate?.from ?? '')
    setAmount(rate ? String(rate.rate) : '')
  }, [open, rate])

  const pending = createRate.isPending || updateRate.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !amount) return
    const input = { from, rate: Number(amount) }
    try {
      if (rate) {
        await updateRate.mutateAsync({ id: rate.id, ...input })
        toast.show('Rate updated')
      } else {
        await createRate.mutateAsync(input)
        toast.show('Rate added')
      }
      onOpenChange(false)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to save rate', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={rate ? 'Edit Rate' : 'Add New Rate Option'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-from">Effective From</Label>
          <Input id="rate-from" type="month" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-amount">Hourly Rate (zł)</Label>
          <Input
            id="rate-amount"
            type="number"
            min="0"
            step="1"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : rate ? 'Save Rate' : 'Add Rate'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
