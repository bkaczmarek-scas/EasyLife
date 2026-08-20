import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { useCreateBonus, useUpdateBonus, type Bonus } from '../../api/resources/bonuses'
import { useToast } from '../../components/ui/Toast'

export function BonusFormDialog({
  open,
  onOpenChange,
  bonus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bonus: Bonus | null
}) {
  const createBonus = useCreateBonus()
  const updateBonus = useUpdateBonus()
  const toast = useToast()

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!open) return
    setName(bonus?.name ?? '')
    setDate(bonus?.date ?? '')
    setAmount(bonus ? String(bonus.amount) : '')
  }, [open, bonus])

  const pending = createBonus.isPending || updateBonus.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !date || !amount) return
    const input = { name: name.trim(), date, amount: Number(amount) }
    try {
      if (bonus) {
        await updateBonus.mutateAsync({ id: bonus.id, ...input })
        toast.show('Bonus updated')
      } else {
        await createBonus.mutateAsync(input)
        toast.show('Bonus added')
      }
      onOpenChange(false)
    } catch {
      toast.show('Failed to save bonus', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={bonus ? 'Edit Record' : 'Add Record'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bonus-name">Name</Label>
          <Input id="bonus-name" placeholder="e.g. Dividend" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bonus-date">Date</Label>
            <Input id="bonus-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bonus-amount">Amount (zł)</Label>
            <Input id="bonus-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
