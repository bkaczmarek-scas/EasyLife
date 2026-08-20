import { useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconCar } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useVehicles, useDeleteVehicle, type Vehicle } from '../../api/resources/vehicles'
import { VehicleFormSheet } from './VehicleFormSheet'
import { VehicleDetailSheet } from './VehicleDetailSheet'
import { dateUrgency } from '../../lib/dateUrgency'

export function GaragePage() {
  const { data: vehicles, isLoading } = useVehicles()
  const deleteVehicle = useDeleteVehicle()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)

  async function handleDelete() {
    if (!deletingVehicle) return
    try {
      await deleteVehicle.mutateAsync(deletingVehicle.id)
      toast.show('Vehicle removed')
      setDeletingVehicle(null)
    } catch {
      toast.show('Failed to delete vehicle', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Garage</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage vehicles, service alerts, and insurance schedules.</p>
        </div>
        <Button
          onClick={() => {
            setEditingVehicle(null)
            setFormOpen(true)
          }}
        >
          <IconPlus size={16} /> Add Vehicle
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading…</p>
      ) : !vehicles || vehicles.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <IconCar size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">No vehicles yet</h2>
          <p className="max-w-xs text-sm text-text-secondary">Add a vehicle to start tracking mileage, service, and insurance.</p>
          <Button
            className="mt-2"
            onClick={() => {
              setEditingVehicle(null)
              setFormOpen(true)
            }}
          >
            Add Vehicle
          </Button>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {vehicles.map((vehicle) => {
            const insurance = dateUrgency(vehicle.insuranceExpiryDate, 'Insurance Overdue', 'Insurance Valid')
            return (
              <Card
                key={vehicle.id}
                className="flex cursor-pointer items-center justify-between hover:border-primary"
                onClick={() => setDetailVehicle(vehicle)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <IconCar size={22} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{vehicle.type}</Badge>
                      <span className="font-semibold text-text-primary">{vehicle.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {[vehicle.year, vehicle.engine, vehicle.power ? `${vehicle.power} HP` : null].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-text-muted">
                      {vehicle.mileage.toLocaleString()} km · Insurance: {insurance.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Edit"
                    onClick={() => {
                      setEditingVehicle(vehicle)
                      setFormOpen(true)
                    }}
                    className="rounded-md p-1.5 text-text-muted hover:bg-canvas hover:text-text-primary"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => setDeletingVehicle(vehicle)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <VehicleFormSheet open={formOpen} onOpenChange={setFormOpen} vehicle={editingVehicle} />
      <VehicleDetailSheet vehicle={detailVehicle} onOpenChange={(open) => !open && setDetailVehicle(null)} />
      <ConfirmDialog
        open={Boolean(deletingVehicle)}
        onOpenChange={(open) => !open && setDeletingVehicle(null)}
        title="Delete vehicle?"
        description={deletingVehicle ? `"${deletingVehicle.name}" and its service history will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteVehicle.isPending}
      />
    </div>
  )
}
