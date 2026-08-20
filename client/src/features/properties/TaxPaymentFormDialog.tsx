import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { useAddTaxPayment, useUpdateTaxPayment, type TaxPayment } from '../../api/resources/taxPayments'
import { useToast } from '../../components/ui/Toast'

export function TaxPaymentFormDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: TaxPayment | null
}) {
  const addPayment = useAddTaxPayment()
  const updatePayment = useUpdateTaxPayment()
  const toast = useToast()

  const [period, setPeriod] = useState('')
  const [amount, setAmount] = useState('')
  const [sienkiewicza, setSienkiewicza] = useState('')
  const [szczesliwa, setSzczesliwa] = useState('')
  const [transferDate, setTransferDate] = useState('')

  useEffect(() => {
    if (!open) return
    setPeriod(payment?.period ?? '')
    setAmount(payment ? String(payment.amount) : '')
    setSienkiewicza(payment?.sienkiewicza != null ? String(payment.sienkiewicza) : '')
    setSzczesliwa(payment?.szczesliwa != null ? String(payment.szczesliwa) : '')
    setTransferDate(payment?.transferDate ?? '')
  }, [open, payment])

  const pending = addPayment.isPending || updatePayment.isPending
  const splitSum = (Number(sienkiewicza) || 0) + (Number(szczesliwa) || 0)
  const splitKnown = sienkiewicza !== '' || szczesliwa !== ''
  const splitMismatch = splitKnown && Number(amount) !== splitSum

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!period || !amount) return
    const input = {
      period,
      amount: Number(amount),
      sienkiewicza: sienkiewicza === '' ? null : Number(sienkiewicza),
      szczesliwa: szczesliwa === '' ? null : Number(szczesliwa),
      transferDate: transferDate || null,
    }
    try {
      if (payment) {
        await updatePayment.mutateAsync({ id: payment.id, ...input })
        toast.show('Payment updated')
      } else {
        await addPayment.mutateAsync(input)
        toast.show('Payment added')
      }
      onOpenChange(false)
    } catch {
      toast.show('Failed to save payment', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={payment ? 'Edit Tax Payment' : 'Add Tax Payment'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax-period">Period</Label>
          <Input id="tax-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax-amount">Amount Transferred (PLN)</Label>
          <Input id="tax-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <p className="text-xs text-text-muted">
          Split between properties, if known — the real transferred amount above is authoritative even if the split doesn't add up yet.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-sienkiewicza">Sienkiewicza (PLN)</Label>
            <Input id="tax-sienkiewicza" type="number" value={sienkiewicza} onChange={(e) => setSienkiewicza(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-szczesliwa">Szczęśliwa (PLN)</Label>
            <Input id="tax-szczesliwa" type="number" value={szczesliwa} onChange={(e) => setSzczesliwa(e.target.value)} />
          </div>
        </div>
        {splitMismatch && (
          <p className="text-xs font-semibold text-warning-text">
            Split total ({splitSum.toFixed(2)} PLN) doesn't match the transferred amount ({Number(amount).toFixed(2)} PLN) — that's fine if the split isn't fully confirmed yet.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax-transfer">Transfer Date</Label>
          <Input id="tax-transfer" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        </div>
        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
