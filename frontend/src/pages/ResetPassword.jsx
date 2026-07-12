import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/resources'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'This reset link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-display font-bold text-3xl text-ink mb-2">Invalid link</h1>
        <p className="text-slate mb-8">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link to="/forgot-password" className="text-accent font-medium hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-display font-bold text-3xl text-ink mb-2">Password reset</h1>
        <p className="text-slate mb-8">Redirecting you to login…</p>
        <Link to="/login" className="text-accent font-medium hover:underline">
          Go to login now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display font-bold text-3xl text-ink mb-2">Set a new password</h1>
      <p className="text-slate mb-8">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper rounded-lg py-3 font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  )
}