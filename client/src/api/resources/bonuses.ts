import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Bonus {
  id: string
  name: string
  date: string
  amount: number
}

export interface BonusInput {
  name: string
  date: string
  amount: number
}

export function useBonuses() {
  return useQuery({
    queryKey: queryKeys.bonuses.all,
    queryFn: () => api.get<{ bonuses: Bonus[] }>('/api/bonuses').then((r) => r.bonuses),
  })
}

function useInvalidateBonuses() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.bonuses.all })
}

export function useCreateBonus() {
  const invalidate = useInvalidateBonuses()
  return useMutation({
    mutationFn: (input: BonusInput) => api.post<{ bonus: Bonus }>('/api/bonuses', input),
    onSuccess: invalidate,
  })
}

export function useUpdateBonus() {
  const invalidate = useInvalidateBonuses()
  return useMutation({
    mutationFn: ({ id, ...input }: BonusInput & { id: string }) => api.put<{ bonus: Bonus }>(`/api/bonuses/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteBonus() {
  const invalidate = useInvalidateBonuses()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/bonuses/${id}`),
    onSuccess: invalidate,
  })
}
