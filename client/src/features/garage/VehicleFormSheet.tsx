import { useEffect, useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useCreateVehicle, useUpdateVehicle, type Vehicle, type VehicleInput } from '../../api/resources/vehicles'
import { useToast } from '../../components/ui/Toast'

const TYPE_OPTIONS = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'other', label: 'Other' },
]

const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
]

export function VehicleFormSheet({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle | null
}) {
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const toast = useToast()

  const [form, setForm] = useState({
    name: '', type: 'car', vin: '', plate: '', year: '', engine: '',
    fuelType: 'petrol', power: '', mileage: '', nextServiceDate: '', insuranceExpiryDate: '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      name: vehicle?.name ?? '',
      type: vehicle?.type ?? 'car',
      vin: vehicle?.vin ?? '',
      plate: vehicle?.plate ?? '',
      year: vehicle?.year ? String(vehicle.year) : '',
      engine: vehicle?.engine ?? '',
      fuelType: vehicle?.fuelType ?? 'petrol',
      power: vehicle?.power ? String(vehicle.power) : '',
      mileage: vehicle ? String(vehicle.mileage) : '',
      nextServiceDate: vehicle?.nextServiceDate ?? '',
      insuranceExpiryDate: vehicle?.insuranceExpiryDate ?? '',
    })
  }, [open, vehicle])

  const pending = createVehicle.isPending || updateVehicle.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const input: VehicleInput = {
      name: form.name.trim(),
      type: form.type,
      vin: form.vin || null,
      plate: form.plate || null,
      year: form.year ? Number(form.year) : null,
      engine: form.engine || null,
      fuelType: form.fuelType,
      power: form.power ? Number(form.power) : null,
      mileage: form.mileage ? Number(form.mileage) : 0,
      nextServiceDate: form.nextServiceDate || null,
      insuranceExpiryDate: form.insuranceExpiryDate || null,
    }
    try {
      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, ...input })
        toast.show('Vehicle updated')
      } else {
        await createVehicle.mutateAsync(input)
        toast.show('Vehicle added')
      }
      onOpenChange(false)
    } catch {
      toast.show('Failed to save vehicle', 'error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={vehicle ? 'Edit Vehicle' : 'Add Vehicle'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-name">Display Name</Label>
          <Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_OPTIONS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-vin">VIN</Label>
          <Input id="v-vin" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-plate">License Plate</Label>
          <Input id="v-plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-year">Year</Label>
            <Input id="v-year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-engine">Engine</Label>
            <Input id="v-engine" value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fuel Type</Label>
          <Select value={form.fuelType} onChange={(v) => setForm({ ...form, fuelType: v })} options={FUEL_OPTIONS} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-power">Power (HP)</Label>
            <Input id="v-power" type="number" value={form.power} onChange={(e) => setForm({ ...form, power: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-mileage">Mileage (km)</Label>
            <Input id="v-mileage" type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-service">Next Service Date</Label>
          <Input id="v-service" type="date" value={form.nextServiceDate ?? ''} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-insurance">Insurance Expiry</Label>
          <Input id="v-insurance" type="date" value={form.insuranceExpiryDate ?? ''} onChange={(e) => setForm({ ...form, insuranceExpiryDate: e.target.value })} />
        </div>

        <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save Vehicle'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
