import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { enrollmentService, courseService } from '../services/resources'

export default function MyLearning() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    enrollmentService.myEnrollments().then(async (res) => {
      const enrollments = res.data
      const withCourses = await Promise.all(
        enrollments.map(async (e) => {
          const courseRes = await courseService.get(e.course_id)
          return { ...e, course: courseRes.data }
        })
      )
      setItems(withCourses)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-center py-24 text-slate">Loading your courses…</p>

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl text-ink mb-8">My learning</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate mb-4">You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="text-accent font-medium hover:underline">
            Browse courses →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/learn/${item.course.id}`}
              className="block border border-line rounded-xl p-5 hover:border-ink/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink">{item.course.title}</h3>
                <span className="text-sm text-slate">{item.progress_percent.toFixed(0)}% complete</span>
              </div>
              <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${item.progress_percent}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
