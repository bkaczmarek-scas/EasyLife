import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface-0 p-4', className)}
      {...props}
    />
  )
}

export function StatTile({ eyebrow, value, note, noteTone = 'neutral', className }: {
  eyebrow: string
  value: string
  note?: string
  noteTone?: 'neutral' | 'danger' | 'success'
  className?: string
}) {
  const noteClass =
    noteTone === 'danger' ? 'text-danger-text' : noteTone === 'success' ? 'text-green-700' : 'text-text-secondary'
  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <p className="text-xs font-semibold uppercase text-text-muted">{eyebrow}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {note && <p className={cn('text-xs font-semibold', noteClass)}>{note}</p>}
    </Card>
  )
}
