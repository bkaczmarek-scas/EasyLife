import { useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconHome } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useProperties, useDeleteProperty, type Property } from '../../api/resources/properties'
import { PropertyFormSheet } from './PropertyFormSheet'
import { PropertyDetailSheet } from './PropertyDetailSheet'
import { TaxLedger } from './TaxLedger'
import { dateUrgency } from '../../lib/dateUrgency'

type PageTab = 'units' | 'tax'

function PropertyCard({
  property,
  onOpen,
  onEdit,
  onDelete,
}: {
  property: Property
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const maintenance = property.maintenanceDate ? dateUrgency(property.maintenanceDate, 'Maintenance Due', 'Maintenance Scheduled') : null
  const leaseUrgency = property.tenant?.leaseEnd ? dateUrgency(property.tenant.leaseEnd, 'Lease Expired', 'Lease Active') : null

  return (
    <Card className="flex cursor-pointer items-center justify-between hover:border-primary" onClick={onOpen}>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <IconHome size={22} className="text-primary" />
        </div>
        <div>
          <span className="font-semibold text-text-primary">{property.name}</span>
          <p className="mt-1 text-xs text-text-secondary">{property.address}</p>
          {property.tenant && (
            <p className="text-xs text-text-muted">
              Tenant: {property.tenant.tenants.map((t) => t.name).join(', ') || '—'} · Rent: {property.tenant.rentAmount} PLN/mo
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {maintenance && <Badge tone={maintenance.tone === 'neutral' ? 'info' : maintenance.tone}>{maintenance.label}</Badge>}
        {leaseUrgency && <Badge tone={leaseUrgency.tone === 'neutral' ? 'info' : leaseUrgency.tone}>{leaseUrgency.label}</Badge>}
        <button type="button" aria-label="Edit" onClick={onEdit} className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary">
          <IconEdit size={16} />
        </button>
        <button type="button" aria-label="Delete" onClick={onDelete} className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text">
          <IconTrash size={16} />
        </button>
      </div>
    </Card>
  )
}

export function PropertiesPage() {
  const { data: properties, isLoading } = useProperties()
  const deleteProperty = useDeleteProperty()
  const toast = useToast()

  const [pageTab, setPageTab] = useState<PageTab>('units')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [detailProperty, setDetailProperty] = useState<Property | null>(null)
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)

  const primary = (properties ?? []).filter((p) => p.type === 'primary')
  const rentals = (properties ?? []).filter((p) => p.type === 'rental')

  async function handleDelete() {
    if (!deletingProperty) return
    try {
      await deleteProperty.mutateAsync(deletingProperty.id)
      toast.show('Property removed')
      setDeletingProperty(null)
    } catch {
      toast.show('Failed to delete property', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Properties</h1>
          <p className="mt-1 text-sm text-text-secondary">Overview of your residential properties and rental agreements.</p>
        </div>
        <Button
          onClick={() => {
            setEditingProperty(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add Property
        </Button>
      </div>

      <div className="mt-6">
        <Tabs
          value={pageTab}
          onChange={setPageTab}
          tabs={[
            { value: 'units', label: 'All Units' },
            { value: 'tax', label: 'Tax Ledger' },
          ]}
        />
      </div>

      <div className="pt-6">
        {pageTab === 'units' &&
          (isLoading ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : (
            <div className="flex flex-col gap-8">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase text-text-muted">Primary Residence</p>
                {primary.length === 0 ? (
                  <p className="text-sm text-text-secondary">No primary residence added.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {primary.map((p) => (
                      <PropertyCard
                        key={p.id}
                        property={p}
                        onOpen={() => setDetailProperty(p)}
                        onEdit={() => {
                          setEditingProperty(p)
                          setFormOpen(true)
                        }}
                        onDelete={() => setDeletingProperty(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase text-text-muted">Rental Units</p>
                {rentals.length === 0 ? (
                  <p className="text-sm text-text-secondary">No rental units added.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {rentals.map((p) => (
                      <PropertyCard
                        key={p.id}
                        property={p}
                        onOpen={() => setDetailProperty(p)}
                        onEdit={() => {
                          setEditingProperty(p)
                          setFormOpen(true)
                        }}
                        onDelete={() => setDeletingProperty(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

        {pageTab === 'tax' && <TaxLedger />}
      </div>

      <PropertyFormSheet open={formOpen} onOpenChange={setFormOpen} property={editingProperty} />
      <PropertyDetailSheet property={detailProperty} onOpenChange={(open) => !open && setDetailProperty(null)} />
      <ConfirmDialog
        open={Boolean(deletingProperty)}
        onOpenChange={(open) => !open && setDeletingProperty(null)}
        title="Delete property?"
        description={deletingProperty ? `"${deletingProperty.name}" will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteProperty.isPending}
      />
    </div>
  )
}
