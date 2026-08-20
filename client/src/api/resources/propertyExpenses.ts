import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface PropertyExpense {
  id: string
  propertyId: string
  date: string
  description: string
  amount: number
}

export interface PropertyExpenseInput {
  propertyId: string
  date: string
  description?: string
  amount?: number
}

export function usePropertyExpenses(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.properties.expenses(propertyId ?? undefined),
    queryFn: () =>
      api.get<{ expenses: PropertyExpense[] }>(`/api/property-expenses?propertyId=${propertyId}`).then((r) => r.expenses),
    enabled: Boolean(propertyId),
  })
}

export function useAddPropertyExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PropertyExpenseInput) => api.post<{ expense: PropertyExpense }>('/api/property-expenses', input),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: queryKeys.properties.expenses(variables.propertyId) }),
  })
}

export function useDeletePropertyExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; propertyId: string }) => api.delete(`/api/property-expenses/${id}`),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: queryKeys.properties.expenses(variables.propertyId) }),
  })
}
