import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-contrast hover:opacity-90 disabled:opacity-40',
  secondary: 'bg-surface-0 text-text-primary border border-border hover:bg-canvas disabled:opacity-40',
  danger: 'bg-danger-bg text-danger-text border border-danger-border hover:bg-red-100 disabled:opacity-40',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
