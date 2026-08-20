import { useEffect, useState } from 'react'
import { IconEdit, IconTrash, IconPlus, IconCar } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useVehicles, useDeleteVehicle, type Vehicle } from '../../api/resources/vehicles'
import { VehicleFormSheet } from './VehicleFormSheet'
import { VehicleServicePanel } from './VehicleServicePanel'
import { dateUrgency } from '../../lib/dateUrgency'
import { cn } from '../../lib/cn'

export function GaragePage() {
  const { data: vehicles, isLoading } = useVehicles()
  const deleteVehicle = useDeleteVehicle()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && vehicles && vehicles.length > 0) setSelectedId(vehicles[0].id)
  }, [vehicles, selectedId])

  async function handleDelete() {
    if (!deletingVehicle) return
    try {
      await deleteVehicle.mutateAsync(deletingVehicle.id)
      toast.show('Vehicle removed')
      if (selectedId === deletingVehicle.id) setSelectedId(null)
      setDeletingVehicle(null)
    } catch {
      toast.show('Failed to delete vehicle', 'error')
    }
  }

  const selectedVehicle = vehicles?.find((v) => v.id === selectedId) ?? null

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Garage</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage vehicles, service alerts, and insurance schedules.</p>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading…</p>
      ) : !vehicles || vehicles.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 py-16 text-center">
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
        <>
          <div className="mt-6 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2">
            {vehicles.map((vehicle) => {
              const insurance = dateUrgency(vehicle.insuranceExpiryDate, 'Overdue', 'Valid')
              const selected = vehicle.id === selectedId
              return (
                <Card
                  key={vehicle.id}
                  className={cn('w-[320px] shrink-0 snap-start cursor-pointer', selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary')}
                  onClick={() => setSelectedId(vehicle.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                        <IconCar size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{vehicle.name}</p>
                        <p className="text-xs text-text-secondary">
                          {[vehicle.year, vehicle.engine, vehicle.power ? `${vehicle.power} HP` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                  </div>

                  <dl className="mt-4 flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-text-secondary">VIN</dt>
                      <dd className="font-semibold text-text-primary">{vehicle.vin || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-text-secondary">Engine</dt>
                      <dd className="font-semibold text-text-primary">{vehicle.engine || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-text-secondary">Year</dt>
                      <dd className="font-semibold text-text-primary">{vehicle.year ?? '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-text-secondary">Fuel</dt>
                      <dd className="font-semibold capitalize text-text-primary">{vehicle.fuelType || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-text-secondary">Mileage</dt>
                      <dd className="font-semibold text-text-primary">{vehicle.mileage.toLocaleString()} km</dd>
                    </div>
                  </dl>

                  <Badge tone={insurance.tone === 'success' ? 'success' : insurance.tone === 'danger' ? 'danger' : 'warning'} className="mt-4">
                    Insurance: {insurance.label}
                  </Badge>
                </Card>
              )
            })}

            <button
              type="button"
              onClick={() => {
                setEditingVehicle(null)
                setFormOpen(true)
              }}
              className="flex w-[320px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm font-semibold text-primary hover:border-primary hover:bg-primary/5"
            >
              <IconPlus size={18} />
              Add Vehicle
            </button>
          </div>

          {selectedVehicle && <VehicleServicePanel key={selectedVehicle.id} vehicle={selectedVehicle} />}
        </>
      )}

      <VehicleFormSheet open={formOpen} onOpenChange={setFormOpen} vehicle={editingVehicle} />
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
