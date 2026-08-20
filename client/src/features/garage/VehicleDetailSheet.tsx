import { useState } from 'react'
import { IconTrash, IconPlus } from '@tabler/icons-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { useServiceLog, useAddServiceEntry, useDeleteServiceEntry } from '../../api/resources/serviceLog'
import { useUpdateMileage, type Vehicle } from '../../api/resources/vehicles'
import { useToast } from '../../components/ui/Toast'

export function VehicleDetailSheet({
  vehicle,
  onOpenChange,
}: {
  vehicle: Vehicle | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: entries } = useServiceLog(vehicle?.id ?? null)
  const addEntry = useAddServiceEntry()
  const deleteEntry = useDeleteServiceEntry()
  const updateMileage = useUpdateMileage()
  const toast = useToast()

  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({ date: '', workshop: '', description: '', cost: '', mileage: '' })
  const [mileageEdit, setMileageEdit] = useState<string | null>(null)

  if (!vehicle) return null

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicle || !logForm.date) return
    try {
      await addEntry.mutateAsync({
        vehicleId: vehicle.id,
        date: logForm.date,
        workshop: logForm.workshop,
        description: logForm.description,
        cost: Number(logForm.cost) || 0,
        mileage: logForm.mileage ? Number(logForm.mileage) : null,
      })
      toast.show('Service entry logged')
      setLogForm({ date: '', workshop: '', description: '', cost: '', mileage: '' })
      setShowLogForm(false)
    } catch {
      toast.show('Failed to log service entry', 'error')
    }
  }

  async function handleUpdateMileage() {
    if (!vehicle || mileageEdit === null) return
    try {
      await updateMileage.mutateAsync({ id: vehicle.id, mileage: Number(mileageEdit) })
      toast.show('Mileage updated')
      setMileageEdit(null)
    } catch {
      toast.show('Failed to update mileage', 'error')
    }
  }

  return (
    <Sheet open={Boolean(vehicle)} onOpenChange={onOpenChange} title={`${vehicle.name} Detail`}>
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Identification &amp; Specs</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-text-secondary">VIN</dt>
            <dd className="text-right font-semibold text-text-primary">{vehicle.vin || '—'}</dd>
            <dt className="text-text-secondary">Engine</dt>
            <dd className="text-right font-semibold text-text-primary">{vehicle.engine || '—'}</dd>
            <dt className="text-text-secondary">Year</dt>
            <dd className="text-right font-semibold text-text-primary">{vehicle.year ?? '—'}</dd>
            <dt className="text-text-secondary">Fuel</dt>
            <dd className="text-right font-semibold capitalize text-text-primary">{vehicle.fuelType || '—'}</dd>
          </dl>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Mileage</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={mileageEdit ?? String(vehicle.mileage)}
              onChange={(e) => setMileageEdit(e.target.value)}
            />
            <span className="shrink-0 text-sm text-text-secondary">km</span>
            <Button
              variant="secondary"
              disabled={mileageEdit === null || updateMileage.isPending}
              onClick={handleUpdateMileage}
            >
              Update
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-text-muted">
              Service History ({entries?.length ?? 0} entries)
            </p>
            <button
              type="button"
              onClick={() => setShowLogForm((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <IconPlus size={14} /> Log service
            </button>
          </div>

          {showLogForm && (
            <form onSubmit={handleAddEntry} className="mb-4 flex flex-col gap-3 rounded-md border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="log-date">Date</Label>
                  <Input id="log-date" type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="log-cost">Cost (PLN)</Label>
                  <Input id="log-cost" type="number" value={logForm.cost} onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="log-workshop">Workshop</Label>
                <Input id="log-workshop" value={logForm.workshop} onChange={(e) => setLogForm({ ...logForm, workshop: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="log-desc">Description</Label>
                <Input id="log-desc" value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="log-mileage">Mileage at service (km)</Label>
                <Input id="log-mileage" type="number" value={logForm.mileage} onChange={(e) => setLogForm({ ...logForm, mileage: e.target.value })} />
              </div>
              <Button type="submit" disabled={addEntry.isPending} className="self-end">
                {addEntry.isPending ? 'Saving…' : 'Save Entry'}
              </Button>
            </form>
          )}

          <div className="flex flex-col gap-3">
            {(entries ?? []).map((entry) => (
              <div key={entry.id} className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{entry.description || entry.workshop || 'Service'}</p>
                  <p className="text-xs text-text-muted">
                    {entry.date}
                    {entry.workshop ? ` · ${entry.workshop}` : ''}
                    {entry.mileage != null ? ` · ${entry.mileage.toLocaleString()} km` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{entry.cost} PLN</span>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={async () => {
                      try {
                        await deleteEntry.mutateAsync({ id: entry.id, vehicleId: vehicle.id })
                        toast.show('Entry deleted')
                      } catch {
                        toast.show('Failed to delete entry', 'error')
                      }
                    }}
                    className="rounded-md p-1 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
            {entries?.length === 0 && <p className="text-sm text-text-secondary">No service history yet.</p>}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
