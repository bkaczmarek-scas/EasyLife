import * as RadixDialog from '@radix-ui/react-dialog'
import { IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <RadixDialog.Content className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border bg-surface-0 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <RadixDialog.Title className="text-lg font-semibold text-text-primary">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-text-muted hover:bg-canvas hover:text-text-primary"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
