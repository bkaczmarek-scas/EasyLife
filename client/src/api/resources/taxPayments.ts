import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface TaxPayment {
  id: string
  period: string // 'YYYY-MM'
  amount: number
  sienkiewicza: number | null
  szczesliwa: number | null
  sienkiewiczaNote: string
  szczesliwaNote: string
  transferDate: string | null
}

export interface TaxPaymentInput {
  period: string
  amount?: number
  sienkiewicza?: number | null
  szczesliwa?: number | null
  sienkiewiczaNote?: string
  szczesliwaNote?: string
  transferDate?: string | null
}

export function useTaxPayments() {
  return useQuery({
    queryKey: queryKeys.taxPayments.all,
    queryFn: () => api.get<{ payments: TaxPayment[] }>('/api/tax-payments').then((r) => r.payments),
  })
}

function useInvalidateTaxPayments() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.taxPayments.all })
}

export function useAddTaxPayment() {
  const invalidate = useInvalidateTaxPayments()
  return useMutation({
    mutationFn: (input: TaxPaymentInput) => api.post<{ payment: TaxPayment }>('/api/tax-payments', input),
    onSuccess: invalidate,
  })
}

export function useUpdateTaxPayment() {
  const invalidate = useInvalidateTaxPayments()
  return useMutation({
    mutationFn: ({ id, ...input }: TaxPaymentInput & { id: string }) =>
      api.put<{ payment: TaxPayment }>(`/api/tax-payments/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteTaxPayment() {
  const invalidate = useInvalidateTaxPayments()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/tax-payments/${id}`),
    onSuccess: invalidate,
  })
}
