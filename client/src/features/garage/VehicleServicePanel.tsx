import { useMemo, useState } from 'react'
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { useServiceLog, useAddServiceEntry, useDeleteServiceEntry } from '../../api/resources/serviceLog'
import { type Vehicle } from '../../api/resources/vehicles'
import { useToast } from '../../components/ui/Toast'
import { formatPLN } from '../../lib/money'
import { MileageChart } from './MileageChart'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMonthLabel(dateStr: string) {
  const d = new Date(dateStr)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function VehicleServicePanel({ vehicle }: { vehicle: Vehicle }) {
  const { data: entries } = useServiceLog(vehicle.id)
  const addEntry = useAddServiceEntry()
  const deleteEntry = useDeleteServiceEntry()
  const toast = useToast()

  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({ date: '', workshop: '', cost: '', mileage: '' })
  const [items, setItems] = useState<string[]>([])
  const [itemDraft, setItemDraft] = useState('')

  function addItem() {
    const trimmed = itemDraft.trim()
    if (!trimmed) return
    setItems((prev) => [...prev, trimmed])
    setItemDraft('')
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!logForm.date) return
    const pendingItem = itemDraft.trim()
    const allItems = pendingItem ? [...items, pendingItem] : items
    try {
      await addEntry.mutateAsync({
        vehicleId: vehicle.id,
        date: logForm.date,
        workshop: logForm.workshop,
        items: allItems,
        cost: Number(logForm.cost) || 0,
        mileage: logForm.mileage ? Number(logForm.mileage) : null,
      })
      toast.show('Service entry logged')
      setLogForm({ date: '', workshop: '', cost: '', mileage: '' })
      setItems([])
      setItemDraft('')
      setShowLogForm(false)
    } catch {
      toast.show('Failed to log service entry', 'error')
    }
  }

  const chart = useMemo(() => {
    const points = (entries ?? [])
      .filter((e) => e.mileage != null)
      .map((e) => ({ date: e.date, mileage: e.mileage as number }))
    points.push({ date: vehicle.mileageUpdatedAt ?? new Date().toISOString().slice(0, 10), mileage: vehicle.mileage })
    points.sort((a, b) => a.date.localeCompare(b.date))
    return { labels: points.map((p) => formatMonthLabel(p.date)), values: points.map((p) => p.mileage) }
  }, [entries, vehicle])

  return (
    <Card className="mt-6 !p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase text-text-muted">Service History ({entries?.length ?? 0} entries)</p>
        <button
          type="button"
          onClick={() => setShowLogForm((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <IconPlus size={14} /> Log service
        </button>
      </div>

      <div className="px-5 py-4">
        {showLogForm && (
          <form onSubmit={handleAddEntry} className="mb-4 flex flex-col gap-3 rounded-md border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="log-date">Date</Label>
                <Input id="log-date" type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="log-cost">Cost (zł)</Label>
                <Input id="log-cost" type="number" value={logForm.cost} onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="log-workshop">Workshop</Label>
              <Input id="log-workshop" value={logForm.workshop} onChange={(e) => setLogForm({ ...logForm, workshop: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="log-item">Service Items</Label>
              <div className="flex gap-2">
                <Input
                  id="log-item"
                  value={itemDraft}
                  onChange={(e) => setItemDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                  placeholder="e.g. wymiana oleju"
                />
                <Button type="button" variant="secondary" onClick={addItem}>
                  Add
                </Button>
              </div>
              {items.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm text-text-primary">
                      {item}
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                        className="rounded p-0.5 text-text-muted hover:bg-canvas hover:text-danger-text"
                      >
                        <IconX size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
          {(entries ?? []).map((entry) => {
            return (
              <div key={entry.id} className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  {entry.items.length > 0 ? (
                    <ul className="list-disc pl-4 text-sm font-semibold text-text-primary">
                      {entry.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-semibold text-text-primary">{entry.workshop || 'Service'}</p>
                  )}
                  <div className="mt-1 text-xs text-text-muted">
                    <p>{entry.date}</p>
                    {entry.workshop && <p>{entry.workshop}</p>}
                    {entry.mileage != null && <p>{entry.mileage.toLocaleString()} km</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{formatPLN(entry.cost)}</span>
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
            )
          })}
          {entries?.length === 0 && <p className="text-sm text-text-secondary">No service history yet.</p>}
        </div>

        <div className="mt-6 rounded-lg border border-border p-4">
          <p className="mb-3 font-semibold text-text-primary">Mileage Over Time</p>
          <div className="h-64">
            <MileageChart labels={chart.labels} values={chart.values} />
          </div>
        </div>
      </div>
    </Card>
  )
}
