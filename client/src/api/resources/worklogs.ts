import { useMutation, useQueries, keepPreviousData } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface WorklogsResponse {
  source: string
  projects: Array<{
    name: string
    hours: number
    items: Array<{ key: string; summary: string; hours: number }>
  }>
  totalHours: number
}

export function useYearWorklogs(year: number) {
  const results = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      return {
        queryKey: queryKeys.worklogs(month, year),
        queryFn: () => api.get<WorklogsResponse>(`/api/worklogs?month=${month}&year=${year}`),
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
      }
    }),
  })

  const isLoading = results.some((r) => r.isLoading)
  const isRefreshing = results.some((r) => r.isPlaceholderData && r.isFetching)
  const byMonth = results.map((r, i) => ({ month: i + 1, totalHours: r.data?.totalHours ?? 0 }))

  return { byMonth, isLoading, isRefreshing }
}

// Explicit-trigger fetch for the Invoicing wizard's "Fetch worklogs" step (matches the existing
// app's UX where worklogs are pulled on demand, not automatically, once a period is chosen).
export function useFetchWorklogs() {
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      api.get<WorklogsResponse>(`/api/worklogs?month=${month}&year=${year}`),
  })
}
