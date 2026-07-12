import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/resources'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      // Always show the same success state, even if the email isn't registered —
      // the backend intentionally doesn't reveal whether an account exists.
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-display font-bold text-3xl text-ink mb-2">Check your email</h1>
        <p className="text-slate mb-8">
          If an account exists for <span className="font-medium text-ink">{email}</span>, we've
          sent a link to reset your password. It expires in 1 hour.
        </p>
        <Link to="/login" className="text-accent font-medium hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display font-bold text-3xl text-ink mb-2">Forgot your password?</h1>
      <p className="text-slate mb-8">
        Enter your email and we'll send you a link to reset it.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper rounded-lg py-3 font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-sm text-slate mt-6">
        Remembered your password?{' '}
        <Link to="/login" className="text-accent font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}