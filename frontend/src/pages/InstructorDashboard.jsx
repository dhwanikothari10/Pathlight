import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '../services/resources'

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    courseService.myCourses().then((res) => {
      setCourses(res.data)
      setLoading(false)
    })
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Delete "${course.title}"? This permanently removes its sections, lectures, and all student data for this course. This can't be undone.`
    )
    if (!confirmed) return

    setDeletingId(course.id)
    try {
      await courseService.remove(course.id)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
    } catch (err) {
      window.alert('Failed to delete course. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl text-ink">Your courses</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/instructor/analytics"
            className="border border-line rounded-lg px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink/30 transition-colors"
          >
            Analytics
          </Link>
          <Link
            to="/instructor/courses/new"
            className="bg-accent text-paper rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            + New course
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-slate">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-slate">You haven't created any courses yet.</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-line rounded-xl p-5 hover:border-ink/30 transition-colors"
            >
              <div>
                <h3 className="font-display font-semibold text-ink">{c.title}</h3>
                <p className="text-sm text-slate mt-1">
                  {c.is_published ? 'Published' : 'Draft'} · ${c.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleDelete(c)}
                  disabled={deletingId === c.id}
                  className="text-red-500 text-sm font-medium hover:underline disabled:opacity-50"
                >
                  {deletingId === c.id ? 'Deleting…' : 'Delete'}
                </button>
                <Link
                  to={`/instructor/courses/${c.id}/manage`}
                  className="text-accent text-sm font-medium"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}