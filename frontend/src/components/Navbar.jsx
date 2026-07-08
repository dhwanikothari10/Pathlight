import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-ink border-b border-ink/10">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-xl text-paper tracking-tight">
          Path<span className="text-accent">light</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link to="/courses" className="text-paper/80 hover:text-paper transition-colors">
            Browse courses
          </Link>

          {user?.role === 'instructor' && (
            <Link to="/instructor/dashboard" className="text-paper/80 hover:text-paper transition-colors">
              Instructor dashboard
            </Link>
          )}

          {user?.role === 'student' && (
            <Link to="/my-learning" className="text-paper/80 hover:text-paper transition-colors">
              My learning
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-paper/60">Hi, {user.full_name.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-paper/10 text-paper hover:bg-paper/20 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-paper/80 hover:text-paper transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-accent text-paper hover:bg-accent/90 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
