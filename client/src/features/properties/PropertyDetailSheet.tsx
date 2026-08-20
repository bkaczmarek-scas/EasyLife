import { useState } from 'react'
import { IconTrash, IconCheck, IconPlus } from '@tabler/icons-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/Toast'
import {
  useAddComment,
  useToggleComment,
  useDeleteComment,
  type Property,
} from '../../api/resources/properties'
import { usePropertyExpenses, useAddPropertyExpense, useDeletePropertyExpense } from '../../api/resources/propertyExpenses'
import { formatPLN } from '../../lib/money'

type Tab = 'overview' | 'comments' | 'expenses'

export function PropertyDetailSheet({
  property,
  onOpenChange,
}: {
  property: Property | null
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [commentText, setCommentText] = useState('')
  const [showGateCode, setShowGateCode] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ date: '', description: '', amount: '' })
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const addComment = useAddComment()
  const toggleComment = useToggleComment()
  const deleteComment = useDeleteComment()
  const { data: expenses } = usePropertyExpenses(property?.id ?? null)
  const addExpense = useAddPropertyExpense()
  const deleteExpense = useDeletePropertyExpense()
  const toast = useToast()

  if (!property) return null

  const unresolvedCount = property.comments.filter((c) => !c.resolved).length

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !commentText.trim()) return
    try {
      await addComment.mutateAsync({ propertyId: property.id, text: commentText.trim() })
      setCommentText('')
    } catch {
      toast.show('Failed to add comment', 'error')
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !expenseForm.date) return
    try {
      await addExpense.mutateAsync({
        propertyId: property.id,
        date: expenseForm.date,
        description: expenseForm.description,
        amount: Number(expenseForm.amount) || 0,
      })
      setExpenseForm({ date: '', description: '', amount: '' })
      setShowExpenseForm(false)
    } catch {
      toast.show('Failed to add expense', 'error')
    }
  }

  return (
    <Sheet open={Boolean(property)} onOpenChange={onOpenChange} title={property.name}>
      <p className="-mt-3 mb-4 text-sm text-text-secondary">{property.address}</p>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'comments', label: 'Comments', count: unresolvedCount },
          { value: 'expenses', label: 'Expenses' },
        ]}
      />

      <div className="pt-4">
        {tab === 'overview' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Maintenance</p>
              <p className="text-sm text-text-primary">{property.maintenanceNote || 'No maintenance scheduled.'}</p>
              {property.maintenanceDate && <p className="text-xs text-text-muted">Date: {property.maintenanceDate}</p>}
            </div>

            {property.tenant && (
              <>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Tenant Information</p>
                  {property.tenant.tenants.map((t, i) => (
                    <div key={i} className="mb-2 text-sm">
                      <p className="font-semibold text-text-primary">{t.name}</p>
                      <p className="text-text-secondary">{t.phone} · {t.email}</p>
                    </div>
                  ))}
                  <p className="text-xs text-text-muted">
                    Lease: {property.tenant.leaseStart ?? '—'} – {property.tenant.leaseEnd ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Rent &amp; Deposit</p>
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-text-secondary">Monthly Rent</dt>
                    <dd className="text-right font-semibold text-text-primary">{formatPLN(property.tenant.rentAmount)}</dd>
                    <dt className="text-text-secondary">Utility Advance</dt>
                    <dd className="text-right font-semibold text-text-primary">{formatPLN(property.tenant.utilityAdvance)}</dd>
                    <dt className="text-text-secondary">Deposit</dt>
                    <dd className="text-right font-semibold text-text-primary">{formatPLN(property.tenant.deposit)}</dd>
                  </dl>
                </div>
                {property.tenant.gateCode && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Gate Code</p>
                    <div className="flex items-center justify-between rounded-md border border-border bg-canvas px-3 py-2">
                      <span className="font-mono text-sm">{showGateCode ? property.tenant.gateCode : '••••••••'}</span>
                      <button
                        type="button"
                        onClick={() => setShowGateCode((v) => !v)}
                        className="text-xs font-semibold text-primary"
                      >
                        {showGateCode ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                  </div>
                )}
                {property.tenant.notes && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Lease Notes</p>
                    <p className="text-sm text-text-secondary">{property.tenant.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button type="submit" disabled={addComment.isPending}>
                Add
              </Button>
            </form>
            <div className="flex flex-col gap-2">
              {property.comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between rounded-md border border-border p-3">
                  <div>
                    <p className={c.resolved ? 'text-sm text-text-muted line-through' : 'text-sm text-text-primary'}>
                      {c.text}
                    </p>
                    <p className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Toggle resolved"
                      onClick={() => toggleComment.mutate({ propertyId: property.id, commentId: c.id })}
                      className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-green-700"
                    >
                      <IconCheck size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete comment"
                      onClick={() => deleteComment.mutate({ propertyId: property.id, commentId: c.id })}
                      className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {property.comments.length === 0 && <p className="text-sm text-text-secondary">No comments yet.</p>}
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowExpenseForm((v) => !v)}
              className="flex items-center gap-1 self-end text-xs font-semibold text-primary"
            >
              <IconPlus size={14} /> Add expense
            </button>
            {showExpenseForm && (
              <form onSubmit={handleAddExpense} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                <Input placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                <Input type="number" placeholder="Amount (zł)" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                <Button type="submit" disabled={addExpense.isPending} className="self-end">
                  Save
                </Button>
              </form>
            )}
            <div className="flex flex-col gap-2">
              {(expenses ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{e.description || 'Expense'}</p>
                    <p className="text-xs text-text-muted">{e.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{formatPLN(e.amount)}</span>
                    <button
                      type="button"
                      aria-label="Delete expense"
                      onClick={() => deleteExpense.mutate({ id: e.id, propertyId: property.id })}
                      className="rounded-md p-1 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {expenses?.length === 0 && <p className="text-sm text-text-secondary">No expenses recorded.</p>}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
