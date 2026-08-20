import { useEffect, useState } from 'react'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useCreateProperty, useUpdateProperty, type Property, type TenantPerson } from '../../api/resources/properties'
import { useToast } from '../../components/ui/Toast'

const emptyTenant: TenantPerson = { name: '', phone: '', email: '' }

export function PropertyFormSheet({
  open,
  onOpenChange,
  property,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
}) {
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()
  const toast = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<'primary' | 'rental'>('primary')
  const [address, setAddress] = useState('')
  const [maintenanceNote, setMaintenanceNote] = useState('')
  const [maintenanceDate, setMaintenanceDate] = useState('')
  const [tenants, setTenants] = useState<TenantPerson[]>([])
  const [leaseStart, setLeaseStart] = useState('')
  const [leaseEnd, setLeaseEnd] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [utilityAdvance, setUtilityAdvance] = useState('')
  const [deposit, setDeposit] = useState('')
  const [gateCode, setGateCode] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setName(property?.name ?? '')
    setType(property?.type ?? 'primary')
    setAddress(property?.address ?? '')
    setMaintenanceNote(property?.maintenanceNote ?? '')
    setMaintenanceDate(property?.maintenanceDate ?? '')
    setTenants(property?.tenant?.tenants ?? [])
    setLeaseStart(property?.tenant?.leaseStart ?? '')
    setLeaseEnd(property?.tenant?.leaseEnd ?? '')
    setRentAmount(property?.tenant ? String(property.tenant.rentAmount) : '')
    setUtilityAdvance(property?.tenant ? String(property.tenant.utilityAdvance) : '')
    setDeposit(property?.tenant ? String(property.tenant.deposit) : '')
    setGateCode(property?.tenant?.gateCode ?? '')
    setNotes(property?.tenant?.notes ?? '')
  }, [open, property])

  const pending = createProperty.isPending || updateProperty.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !address.trim()) return
    const input = {
      name: name.trim(),
      type,
      address: address.trim(),
      maintenanceNote,
      maintenanceDate: maintenanceDate || null,
      tenant:
        type === 'rental'
          ? {
              tenants: tenants.filter((t) => t.name.trim()),
              leaseStart: leaseStart || null,
              leaseEnd: leaseEnd || null,
              rentAmount: Number(rentAmount) || 0,
              utilityAdvance: Number(utilityAdvance) || 0,
              deposit: Number(deposit) || 0,
              taxDue: 0,
              gateCode,
              notes,
            }
          : null,
    }
    try {
      if (property) {
        await updateProperty.mutateAsync({ id: property.id, ...input })
        toast.show('Property updated')
      } else {
        await createProperty.mutateAsync(input)
        toast.show('Property added')
      }
      onOpenChange(false)
    } catch {
      toast.show('Failed to save property', 'error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={property ? 'Edit Property' : 'Add Property'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select
            value={type}
            onChange={(v) => setType(v as 'primary' | 'rental')}
            options={[
              { value: 'primary', label: 'Primary Residence' },
              { value: 'rental', label: 'Rental Unit' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-address">Address</Label>
          <Input id="p-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-maint-note">Maintenance Note</Label>
          <Input id="p-maint-note" value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-maint-date">Maintenance Date</Label>
          <Input id="p-maint-date" type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} />
        </div>

        {type === 'rental' && (
          <>
            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <Label>Tenants</Label>
                <button
                  type="button"
                  onClick={() => setTenants([...tenants, { ...emptyTenant }])}
                  className="flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <IconPlus size={14} /> Add tenant
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {tenants.map((t, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-muted">Tenant {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setTenants(tenants.filter((_, idx) => idx !== i))}
                        className="text-text-muted hover:text-danger-text"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                    <Input
                      placeholder="Name"
                      value={t.name}
                      onChange={(e) => setTenants(tenants.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <Input
                      placeholder="Phone"
                      value={t.phone}
                      onChange={(e) => setTenants(tenants.map((x, idx) => (idx === i ? { ...x, phone: e.target.value } : x)))}
                    />
                    <Input
                      placeholder="Email"
                      value={t.email}
                      onChange={(e) => setTenants(tenants.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))}
                    />
                  </div>
                ))}
                {tenants.length === 0 && <p className="text-xs text-text-muted">No tenants added yet.</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-lease-start">Lease Start</Label>
                <Input id="p-lease-start" type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-lease-end">Lease End</Label>
                <Input id="p-lease-end" type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-rent">Rent (PLN)</Label>
                <Input id="p-rent" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-utility">Utility Adv.</Label>
                <Input id="p-utility" type="number" value={utilityAdvance} onChange={(e) => setUtilityAdvance(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-deposit">Deposit</Label>
                <Input id="p-deposit" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-gate">Gate Code</Label>
              <Input id="p-gate" value={gateCode} onChange={(e) => setGateCode(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-notes">Lease Notes</Label>
              <textarea
                id="p-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2.5 text-[13px] text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        )}

        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save Property'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
