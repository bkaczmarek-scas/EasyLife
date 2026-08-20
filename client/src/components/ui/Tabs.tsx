import { cn } from '../../lib/cn'

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T
  onChange: (value: T) => void
  tabs: Array<{ value: T; label: string; count?: number }>
}) {
  return (
    <div className="flex gap-5 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 border-b-2 border-transparent pb-2.5 text-[13px] font-semibold text-text-secondary',
            value === tab.value && 'border-primary text-primary'
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="rounded-full bg-danger-bg px-1.5 text-[11px] font-bold text-danger-text">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
