import { Navigate } from 'react-router-dom'
import { useStatus } from '../../api/resources/status'
import { UnauthorizedError } from '../../api/client'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading } = useStatus()

  if (isLoading) return null
  if (error instanceof UnauthorizedError) return <Navigate to="/login" replace />
  if (!data) return <Navigate to="/login" replace />

  return <>{children}</>
}
