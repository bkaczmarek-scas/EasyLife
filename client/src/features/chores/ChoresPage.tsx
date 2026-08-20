import { useMemo, useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import {
  useChores,
  useDeleteChore,
  useToggleChore,
  type Chore,
} from '../../api/resources/chores'
import { useProperties } from '../../api/resources/properties'
import { useVehicles } from '../../api/resources/vehicles'
import { ChoreFormDialog } from './ChoreFormDialog'

const priorityTone: Record<Chore['priority'], BadgeTone> = { P1: 'danger', P2: 'warning', P3: 'info' }
const frequencyLabel: Record<Chore['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  once: 'Once',
}

export function ChoresPage() {
  const { data: chores, isLoading } = useChores()
  const { data: properties } = useProperties()
  const { data: vehicles } = useVehicles()
  const deleteChore = useDeleteChore()
  const toggleChore = useToggleChore()
  const toast = useToast()

  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [frequencyFilter, setFrequencyFilter] = useState('all')
  const [assetFilter, setAssetFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [deletingChore, setDeletingChore] = useState<Chore | null>(null)

  const assetName = (chore: Chore) => {
    if (chore.propertyId) return properties?.find((p) => p.id === chore.propertyId)?.name ?? '—'
    if (chore.vehicleId) return vehicles?.find((v) => v.id === chore.vehicleId)?.name ?? '—'
    return '—'
  }

  const { active, completed } = useMemo(() => {
    const all = chores ?? []
    const completed = all.filter((c) => c.frequency === 'once' && c.doneThisPeriod)
    const active = all.filter((c) => !(c.frequency === 'once' && c.doneThisPeriod))
    return { active, completed }
  }, [chores])

  const filtered = active.filter((c) => {
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
    if (frequencyFilter !== 'all' && c.frequency !== frequencyFilter) return false
    if (statusFilter === 'pending' && c.doneThisPeriod) return false
    if (statusFilter === 'done' && !c.doneThisPeriod) return false
    if (assetFilter !== 'all' && c.propertyId !== assetFilter && c.vehicleId !== assetFilter) return false
    return true
  })

  const assetOptions = [
    { value: 'all', label: 'All Properties' },
    ...(properties ?? []).map((p) => ({ value: p.id, label: p.name })),
    ...(vehicles ?? []).map((v) => ({ value: v.id, label: v.name })),
  ]

  async function handleDelete() {
    if (!deletingChore) return
    try {
      await deleteChore.mutateAsync(deletingChore.id)
      toast.show('Task deleted')
      setDeletingChore(null)
    } catch {
      toast.show('Failed to delete task', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Home Maintenance &amp; Tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">Organize and track recurring chores across your properties.</p>
        </div>
        <Button
          onClick={() => {
            setEditingChore(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add Task
        </Button>
      </div>

      <Card className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase text-text-muted">Filters:</span>
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          className="w-36"
          options={[
            { value: 'all', label: 'Priority: All' },
            { value: 'P1', label: 'P1' },
            { value: 'P2', label: 'P2' },
            { value: 'P3', label: 'P3' },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-40"
          options={[
            { value: 'all', label: 'Status: All' },
            { value: 'pending', label: 'Status: Pending' },
            { value: 'done', label: 'Status: Done' },
          ]}
        />
        <Select
          value={frequencyFilter}
          onChange={setFrequencyFilter}
          className="w-40"
          options={[
            { value: 'all', label: 'Frequency: Any' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'once', label: 'Once' },
          ]}
        />
        <Select value={assetFilter} onChange={setAssetFilter} className="w-44" options={assetOptions} />
      </Card>

      <Card className="mt-4 overflow-hidden !p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-text-secondary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No tasks match these filters.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
                <th className="w-10 py-3 pl-4" />
                <th className="py-3">Name</th>
                <th className="py-3">Priority</th>
                <th className="py-3">Frequency</th>
                <th className="py-3">Status</th>
                <th className="py-3">Linked Asset</th>
                <th className="w-20 py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((chore) => (
                <tr key={chore.id} className="border-b border-border last:border-0">
                  <td className="py-3 pl-4">
                    <button
                      type="button"
                      aria-label="Toggle complete"
                      onClick={() => toggleChore.mutate(chore.id)}
                      className={`h-4.5 w-4.5 rounded-full border-2 ${
                        chore.doneThisPeriod ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    />
                  </td>
                  <td className="py-3 font-semibold text-text-primary">{chore.name}</td>
                  <td className="py-3">
                    <Badge tone={priorityTone[chore.priority]}>{chore.priority}</Badge>
                  </td>
                  <td className="py-3 text-text-secondary">{frequencyLabel[chore.frequency]}</td>
                  <td className="py-3">
                    {chore.doneThisPeriod ? (
                      <span className="font-semibold text-green-700">Done{chore.streak > 1 ? ` · ${chore.streak}× streak` : ''}</span>
                    ) : (
                      <span className="font-semibold text-warning-text">Pending</span>
                    )}
                  </td>
                  <td className="py-3 text-text-secondary">{assetName(chore)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => {
                          setEditingChore(chore)
                          setFormOpen(true)
                        }}
                        className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => setDeletingChore(chore)}
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
        )}
      </Card>

      {completed.length > 0 && (
        <Card className="mt-4 !p-0">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-semibold text-text-primary"
          >
            <span className="flex items-center gap-1.5">
              {showCompleted ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              Completed Tasks ({completed.length})
            </span>
          </button>
          {showCompleted && (
            <div className="border-t border-border">
              {completed.map((chore) => (
                <div key={chore.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                  <span className="text-text-secondary line-through">{chore.name}</span>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => setDeletingChore(chore)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ChoreFormDialog open={formOpen} onOpenChange={setFormOpen} chore={editingChore} />
      <ConfirmDialog
        open={Boolean(deletingChore)}
        onOpenChange={(open) => !open && setDeletingChore(null)}
        title="Delete task?"
        description={deletingChore ? `"${deletingChore.name}" will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteChore.isPending}
      />
    </div>
  )
}
