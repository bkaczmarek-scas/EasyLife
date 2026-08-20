import * as RadixToast from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ToastItem {
  id: number
  title: string
  tone: 'success' | 'error'
}

const ToastContext = createContext<{ show: (title: string, tone?: ToastItem['tone']) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((title: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, title, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            className={cn(
              'rounded-md border px-4 py-3 text-sm font-medium shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
              t.tone === 'success'
                ? 'border-border bg-surface-0 text-text-primary'
                : 'border-danger-border bg-danger-bg text-danger-text'
            )}
          >
            <RadixToast.Title>{t.title}</RadixToast.Title>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
