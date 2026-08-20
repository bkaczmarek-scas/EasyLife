import { cn } from '../../lib/cn'

export type BadgeTone = 'danger' | 'warning' | 'info' | 'success'

const toneClasses: Record<BadgeTone, string> = {
  danger: 'bg-danger-bg border-danger-border text-danger-text',
  warning: 'bg-warning-bg border-warning-border text-warning-text',
  info: 'bg-info-bg border-info-border text-info-text',
  success: 'bg-green-50 border-green-200 text-green-700',
}

export function Badge({ tone, children, className }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold uppercase leading-none',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
