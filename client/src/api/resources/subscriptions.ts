import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface Subscription {
  id: string
  name: string
  category: string
  cost: number
  billingCycle: 'monthly' | 'yearly'
  nextRenewalDate: string | null
  autoRenew: boolean
  lastUsedDate: string | null
}

export interface SubscriptionInput {
  name: string
  category?: string
  cost?: number
  billingCycle: 'monthly' | 'yearly'
  nextRenewalDate?: string | null
  autoRenew?: boolean
  lastUsedDate?: string | null
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions.all,
    queryFn: () => api.get<{ subscriptions: Subscription[] }>('/api/subscriptions').then((r) => r.subscriptions),
  })
}

function useInvalidateSubscriptions() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all })
}

export function useCreateSubscription() {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: (input: SubscriptionInput) => api.post<{ subscription: Subscription }>('/api/subscriptions', input),
    onSuccess: invalidate,
  })
}

export function useUpdateSubscription() {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: ({ id, ...input }: SubscriptionInput & { id: string }) =>
      api.put<{ subscription: Subscription }>(`/api/subscriptions/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteSubscription() {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/subscriptions/${id}`),
    onSuccess: invalidate,
  })
}
