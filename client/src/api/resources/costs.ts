import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Cost {
  month: string // 'YYYY-MM'
  zus: number
  tax: number
  accounting: number
}

export function useCosts() {
  return useQuery({
    queryKey: queryKeys.costs.all,
    queryFn: () => api.get<{ costs: Cost[] }>('/api/costs').then((r) => r.costs),
  })
}

export function useUpsertCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ month, ...input }: Cost) => api.put<{ cost: Cost }>(`/api/costs/${month}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.costs.all }),
  })
}
