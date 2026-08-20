import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Rate {
  id: string
  from: string // 'YYYY-MM'
  rate: number
}

export interface RateInput {
  from: string
  rate: number
}

export function useRates() {
  return useQuery({
    queryKey: queryKeys.rates.all,
    queryFn: () => api.get<{ history: Rate[] }>('/api/rates').then((r) => r.history),
  })
}

function useInvalidateRates() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.rates.all })
}

export function useCreateRate() {
  const invalidate = useInvalidateRates()
  return useMutation({
    mutationFn: (input: RateInput) => api.post<{ rate: Rate }>('/api/rates', input),
    onSuccess: invalidate,
  })
}

export function useUpdateRate() {
  const invalidate = useInvalidateRates()
  return useMutation({
    mutationFn: ({ id, ...input }: RateInput & { id: string }) => api.put<{ rate: Rate }>(`/api/rates/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRate() {
  const invalidate = useInvalidateRates()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/rates/${id}`),
    onSuccess: invalidate,
  })
}
