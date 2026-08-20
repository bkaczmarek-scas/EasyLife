import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface ProtocolHistoryEntry {
  id: string
  month: number
  year: number
  orderNumber: string | null
  totalHours: number | null
  amount: number | null
  generatedAt: string | null
  exported: boolean
  exportedAt: string | null
  files: { zamowienie?: { filename: string }; odbiorczy?: { filename: string } }
  manualFiles: Array<{ id: string; filename: string; uploadedAt: string }>
}

export function useProtocolsHistory() {
  return useQuery({
    queryKey: queryKeys.protocolsHistory.all,
    queryFn: () => api.get<{ history: ProtocolHistoryEntry[] }>('/api/protocols/history').then((r) => r.history),
  })
}

function useInvalidateHistory() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.protocolsHistory.all })
}

function downloadBase64(filename: string, base64: string) {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useDownloadProtocolFile() {
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: 'zamowienie' | 'odbiorczy' }) => {
      const res = await api.get<{ filename: string; base64: string }>(`/api/protocols/history/${id}/download/${kind}`)
      downloadBase64(res.filename, res.base64)
    },
  })
}

export function useDownloadManualFile() {
  return useMutation({
    mutationFn: async ({ id, fileId }: { id: string; fileId: string }) => {
      const res = await api.get<{ filename: string; base64: string }>(`/api/protocols/history/${id}/manual/${fileId}/download`)
      downloadBase64(res.filename, res.base64)
    },
  })
}

export function useUploadManualFile() {
  const invalidate = useInvalidateHistory()
  return useMutation({
    mutationFn: (input: { month: number; year: number; filename: string; base64: string }) =>
      api.post<{ protocol: ProtocolHistoryEntry }>('/api/protocols/history/upload', input),
    onSuccess: invalidate,
  })
}

export function useDeleteHistoryEntry() {
  const invalidate = useInvalidateHistory()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/protocols/history/${id}`),
    onSuccess: invalidate,
  })
}

export interface GenerateProtocolsResult {
  historyId: string
  zamowienie: { filename: string; base64: string }
  odbiorczy: { filename: string; base64: string }
}

export function useGenerateProtocols() {
  const invalidate = useInvalidateHistory()
  return useMutation({
    mutationFn: (input: { month: number; year: number; projects: Array<{ name: string; hours: number; items: Array<{ key: string; summary: string; hours: number }> }>; totalHours: number; force?: boolean }) =>
      api.post<GenerateProtocolsResult>('/api/protocols/generate', input),
    onSuccess: invalidate,
  })
}

export function useDeleteHistoryFile() {
  const invalidate = useInvalidateHistory()
  return useMutation({
    mutationFn: ({ id, target }: { id: string; target: string }) => api.delete(`/api/protocols/history/${id}/file/${target}`),
    onSuccess: invalidate,
  })
}
