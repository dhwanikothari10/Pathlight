import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display font-bold text-3xl text-ink mb-2">Create your account</h1>
      <p className="text-slate mb-8">Join as a student or start teaching.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink">Full name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink mb-2 block">I want to</label>
          <div className="grid grid-cols-2 gap-3">
            {['student', 'instructor'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => update('role', role)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  form.role === role
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line text-slate hover:border-ink/30'
                }`}
              >
                {role === 'student' ? 'Learn' : 'Teach'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper rounded-lg py-3 font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-slate mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-accent font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
