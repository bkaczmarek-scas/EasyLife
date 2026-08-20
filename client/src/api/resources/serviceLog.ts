import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface ServiceLogEntry {
  id: string
  vehicleId: string
  date: string
  workshop: string
  description: string
  cost: number
  mileage: number | null
}

export interface ServiceLogInput {
  vehicleId: string
  date: string
  workshop?: string
  description?: string
  cost?: number
  mileage?: number | null
}

export function useServiceLog(vehicleId: string | null) {
  return useQuery({
    queryKey: queryKeys.vehicles.serviceLog(vehicleId ?? undefined),
    queryFn: () =>
      api
        .get<{ entries: ServiceLogEntry[] }>(`/api/service-log?vehicleId=${vehicleId}`)
        .then((r) => r.entries),
    enabled: Boolean(vehicleId),
  })
}

export function useAddServiceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ServiceLogInput) => api.post<{ entry: ServiceLogEntry }>('/api/service-log', input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.serviceLog(variables.vehicleId) })
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.all })
    },
  })
}

export function useDeleteServiceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; vehicleId: string }) => api.delete(`/api/service-log/${id}`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.serviceLog(variables.vehicleId) })
    },
  })
}
