import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { queryKeys } from '../queryKeys'

export interface TenantPerson {
  name: string
  phone: string
  email: string
}

export interface Tenant {
  tenants: TenantPerson[]
  leaseStart: string | null
  leaseEnd: string | null
  rentAmount: number
  utilityAdvance: number
  taxDue: number
  deposit: number
  gateCode: string
  notes: string
}

export interface PropertyComment {
  id: string
  text: string
  resolved: boolean
  createdAt: string
}

export interface Property {
  id: string
  name: string
  type: 'primary' | 'rental'
  address: string
  tenant: Tenant | null
  comments: PropertyComment[]
  maintenanceNote: string
  maintenanceDate: string | null
}

export interface PropertyInput {
  name: string
  type: 'primary' | 'rental'
  address: string
  tenant?: Tenant | null
  maintenanceNote?: string
  maintenanceDate?: string | null
}

export function useProperties() {
  return useQuery({
    queryKey: queryKeys.properties.all,
    queryFn: () => api.get<{ properties: Property[] }>('/api/properties').then((r) => r.properties),
  })
}

function useInvalidateProperties() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.properties.all })
}

export function useCreateProperty() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: (input: PropertyInput) => api.post<{ property: Property }>('/api/properties', input),
    onSuccess: invalidate,
  })
}

export function useUpdateProperty() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: ({ id, ...input }: PropertyInput & { id: string }) =>
      api.put<{ property: Property }>(`/api/properties/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteProperty() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/properties/${id}`),
    onSuccess: invalidate,
  })
}

export function useAddComment() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: ({ propertyId, text }: { propertyId: string; text: string }) =>
      api.post<{ property: Property }>(`/api/properties/${propertyId}/comments`, { text }),
    onSuccess: invalidate,
  })
}

export function useToggleComment() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: ({ propertyId, commentId }: { propertyId: string; commentId: string }) =>
      api.put<{ property: Property }>(`/api/properties/${propertyId}/comments/${commentId}/resolve`),
    onSuccess: invalidate,
  })
}

export function useDeleteComment() {
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: ({ propertyId, commentId }: { propertyId: string; commentId: string }) =>
      api.delete(`/api/properties/${propertyId}/comments/${commentId}`),
    onSuccess: invalidate,
  })
}
