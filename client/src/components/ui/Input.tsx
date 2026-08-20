import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border bg-surface-0 px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted',
        'focus:outline-none focus:ring-1',
        error
          ? 'border-danger-text bg-danger-bg focus:ring-danger-text'
          : 'border-border focus:border-primary focus:ring-primary',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export function Label({ className, error, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { error?: boolean }) {
  return (
    <label
      className={cn('text-xs font-semibold', error ? 'text-danger-text' : 'text-text-secondary', className)}
      {...props}
    />
  )
}
