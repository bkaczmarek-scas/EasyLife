import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface StatusResponse {
  jiraConfigured: boolean
  tempoConfigured: boolean
  ifirmaConfigured: boolean
  email: string
}

export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => api.get<StatusResponse>('/api/status'),
  })
}
