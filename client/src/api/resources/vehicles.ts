import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Vehicle {
  id: string
  name: string
  type: string
  year: number | null
  engine: string | null
  fuelType: string | null
  power: number | null
  plate: string | null
  vin: string | null
  mileage: number
  nextServiceDate: string | null
  insuranceExpiryDate: string | null
  mileageUpdatedAt: string | null
}

export interface VehicleInput {
  name: string
  type: string
  year?: number | null
  engine?: string | null
  fuelType?: string | null
  power?: number | null
  plate?: string | null
  vin?: string | null
  mileage?: number
  nextServiceDate?: string | null
  insuranceExpiryDate?: string | null
}

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.all,
    queryFn: () => api.get<{ vehicles: Vehicle[] }>('/api/vehicles').then((r) => r.vehicles),
  })
}

function useInvalidateVehicles() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all })
}

export function useCreateVehicle() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: (input: VehicleInput) => api.post<{ vehicle: Vehicle }>('/api/vehicles', input),
    onSuccess: invalidate,
  })
}

export function useUpdateVehicle() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: ({ id, ...input }: VehicleInput & { id: string }) =>
      api.put<{ vehicle: Vehicle }>(`/api/vehicles/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useUpdateMileage() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: ({ id, mileage }: { id: string; mileage: number }) =>
      api.put<{ vehicle: Vehicle }>(`/api/vehicles/${id}/mileage`, { mileage }),
    onSuccess: invalidate,
  })
}

export function useDeleteVehicle() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/vehicles/${id}`),
    onSuccess: invalidate,
  })
}
