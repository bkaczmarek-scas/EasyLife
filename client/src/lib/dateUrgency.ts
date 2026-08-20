export type Urgency = { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral' }

export function dateUrgency(dateStr: string | null, overdueLabel = 'Overdue', validLabel = 'Valid'): Urgency {
  if (!dateStr) return { label: 'No date set', tone: 'neutral' }
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: overdueLabel, tone: 'danger' }
  if (days <= 30) return { label: `${days}d left`, tone: 'warning' }
  return { label: validLabel, tone: 'success' }
}
