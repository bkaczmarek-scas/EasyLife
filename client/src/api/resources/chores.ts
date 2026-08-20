import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Chore {
  id: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'once'
  notes: string
  priority: 'P1' | 'P2' | 'P3'
  propertyId: string | null
  vehicleId: string | null
  completions: string[]
  doneThisPeriod: boolean
  streak: number
}

export interface ChoreInput {
  name: string
  frequency: Chore['frequency']
  notes?: string
  priority: Chore['priority']
  propertyId?: string | null
  vehicleId?: string | null
}

export function useChores() {
  return useQuery({
    queryKey: queryKeys.chores.all,
    queryFn: () => api.get<{ chores: Chore[] }>('/api/chores').then((r) => r.chores),
  })
}

function useInvalidateChores() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.chores.all })
}

export function useCreateChore() {
  const invalidate = useInvalidateChores()
  return useMutation({
    mutationFn: (input: ChoreInput) => api.post<{ chore: Chore }>('/api/chores', input),
    onSuccess: invalidate,
  })
}

export function useUpdateChore() {
  const invalidate = useInvalidateChores()
  return useMutation({
    mutationFn: ({ id, ...input }: ChoreInput & { id: string }) =>
      api.put<{ chore: Chore }>(`/api/chores/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteChore() {
  const invalidate = useInvalidateChores()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/chores/${id}`),
    onSuccess: invalidate,
  })
}

export function useToggleChore() {
  const invalidate = useInvalidateChores()
  return useMutation({
    mutationFn: (id: string) => api.post<{ chore: Chore }>(`/api/chores/${id}/toggle`),
    onSuccess: invalidate,
  })
}
