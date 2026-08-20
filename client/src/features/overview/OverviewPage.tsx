import { useNavigate } from 'react-router-dom'
import { IconRefresh, IconCircleCheck } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAttentionItems } from './useAttentionItems'
import { useToggleChore } from '../../api/resources/chores'
import { useToast } from '../../components/ui/Toast'

export function OverviewPage() {
  const { items, isLoading, refetchAll } = useAttentionItems()
  const toggleChore = useToggleChore()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleAction(item: (typeof items)[number]) {
    if (item.choreId) {
      try {
        await toggleChore.mutateAsync(item.choreId)
        toast.show('Task marked complete')
        return
      } catch {
        toast.show('Failed to update task', 'error')
        return
      }
    }
    if (item.actionTo) navigate(item.actionTo)
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Overview</h1>
          <p className="mt-1 text-sm text-text-secondary">What needs your administrative attention today.</p>
        </div>
        <Button variant="secondary" onClick={refetchAll}>
          <IconRefresh size={16} /> Refresh Sync
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-0 py-16 text-center">
            <IconCircleCheck size={32} className="text-green-600" />
            <p className="text-lg font-bold text-text-primary">Nothing needs attention right now.</p>
            <p className="text-sm text-text-secondary">All your actions are fully up to date and clean.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg border border-border bg-surface-0 p-4 border-l-4 ${
                item.tone === 'danger' ? 'border-l-danger-text' : item.tone === 'warning' ? 'border-l-warning-text' : 'border-l-info-text'
              }`}
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.tone}>{item.tag}</Badge>
                  <span className="text-xs text-text-muted">{item.source}</span>
                </div>
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm font-semibold ${
                    item.tone === 'danger' ? 'text-danger-text' : item.tone === 'warning' ? 'text-warning-text' : 'text-info-text'
                  }`}
                >
                  {item.dueLabel}
                </span>
                <Button variant="secondary" onClick={() => handleAction(item)}>
                  {item.actionLabel}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
