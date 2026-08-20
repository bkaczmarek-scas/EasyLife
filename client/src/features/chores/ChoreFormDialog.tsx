import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/cn'
import { useCreateChore, useUpdateChore, type Chore, type ChoreInput } from '../../api/resources/chores'
import { useProperties } from '../../api/resources/properties'
import { useVehicles } from '../../api/resources/vehicles'
import { useToast } from '../../components/ui/Toast'

const FREQUENCIES: Array<{ value: ChoreInput['frequency']; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'Once' },
]

const PRIORITIES: Array<{ value: ChoreInput['priority']; label: string; className: string }> = [
  { value: 'P1', label: 'P1 High', className: 'text-danger-text' },
  { value: 'P2', label: 'P2 Medium', className: 'text-warning-text' },
  { value: 'P3', label: 'P3 Low', className: 'text-info-text' },
]

export function ChoreFormDialog({
  open,
  onOpenChange,
  chore,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chore: Chore | null
}) {
  const { data: properties } = useProperties()
  const { data: vehicles } = useVehicles()
  const createChore = useCreateChore()
  const updateChore = useUpdateChore()
  const toast = useToast()

  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<ChoreInput['frequency']>('weekly')
  const [priority, setPriority] = useState<ChoreInput['priority']>('P2')
  const [notes, setNotes] = useState('')
  const [propertyId, setPropertyId] = useState('none')
  const [vehicleId, setVehicleId] = useState('none')

  useEffect(() => {
    if (!open) return
    setName(chore?.name ?? '')
    setFrequency(chore?.frequency ?? 'weekly')
    setPriority(chore?.priority ?? 'P2')
    setNotes(chore?.notes ?? '')
    setPropertyId(chore?.propertyId ?? 'none')
    setVehicleId(chore?.vehicleId ?? 'none')
  }, [open, chore])

  const pending = createChore.isPending || updateChore.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const input: ChoreInput = {
      name: name.trim(),
      frequency,
      priority,
      notes: notes.trim(),
      propertyId: propertyId === 'none' ? null : propertyId,
      vehicleId: vehicleId === 'none' ? null : vehicleId,
    }
    try {
      if (chore) {
        await updateChore.mutateAsync({ id: chore.id, ...input })
        toast.show('Task updated')
      } else {
        await createChore.mutateAsync(input)
        toast.show('Task created')
      }
      onOpenChange(false)
    } catch {
      toast.show(chore ? 'Failed to update task' : 'Failed to create task', 'error')
    }
  }

  const propertyOptions = [{ value: 'none', label: 'None' }, ...(properties ?? []).map((p) => ({ value: p.id, label: p.name }))]
  const vehicleOptions = [{ value: 'none', label: 'None' }, ...(vehicles ?? []).map((v) => ({ value: v.id, label: v.name }))]

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={chore ? 'Edit Task' : 'Add New Task'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chore-name">Task Name</Label>
          <Input
            id="chore-name"
            placeholder="e.g. Wash building facade windows"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Frequency</Label>
          <div className="flex rounded-md border border-border bg-canvas p-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={cn(
                  'flex-1 rounded-sm py-1.5 text-[13px] font-medium text-text-secondary',
                  frequency === f.value && 'bg-surface-0 font-semibold text-text-primary shadow-sm'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Priority Level</Label>
          <div className="flex gap-4">
            {PRIORITIES.map((p) => (
              <label key={p.value} className="flex items-center gap-1.5 text-[13px]">
                <input
                  type="radio"
                  name="priority"
                  checked={priority === p.value}
                  onChange={() => setPriority(p.value)}
                  className="accent-primary"
                />
                <span className={cn('font-semibold', p.className)}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chore-notes">Notes (Optional)</Label>
          <textarea
            id="chore-notes"
            placeholder="Provide relevant details or service contacts…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-surface-0 px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Linked Property</Label>
            <Select value={propertyId} onChange={setPropertyId} options={propertyOptions} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Linked Vehicle</Label>
            <Select value={vehicleId} onChange={setVehicleId} options={vehicleOptions} />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : chore ? 'Save Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
