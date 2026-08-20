import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconFolder } from '@tabler/icons-react'
import { Input, Label } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { api } from '../../api/client'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/api/login', { email, password })
      navigate('/overview', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-border bg-surface-0 p-8">
        <div className="mb-6 flex items-center gap-2">
          <IconFolder size={24} className="text-primary" />
          <span className="text-xl font-bold text-text-primary">EasyLife</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="Enter credentials..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" error={Boolean(error)}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              error={Boolean(error)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-xs text-danger-text">{error}</p>}
          </div>
          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
