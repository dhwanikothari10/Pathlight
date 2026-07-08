import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { analyticsService } from '../services/resources'

export default function InstructorAnalytics() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsService
      .myCoursesAnalytics()
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0)
  const totalEnrollments = rows.reduce((acc, r) => acc + r.enrollment_count, 0)
  const avgCompletion = rows.length
    ? rows.reduce((acc, r) => acc + r.completion_rate, 0) / rows.length
    : 0

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl text-ink">Analytics</h1>
        <Link to="/instructor/dashboard" className="text-accent text-sm font-medium">
          ← Back to your courses
        </Link>
      </div>

      {loading ? (
        <p className="text-slate">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate">You don't have any courses yet.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="border border-line rounded-xl p-5">
              <p className="text-sm text-slate">Total revenue</p>
              <p className="font-display font-bold text-2xl text-ink mt-1">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="border border-line rounded-xl p-5">
              <p className="text-sm text-slate">Total enrollments</p>
              <p className="font-display font-bold text-2xl text-ink mt-1">{totalEnrollments}</p>
            </div>
            <div className="border border-line rounded-xl p-5">
              <p className="text-sm text-slate">Avg. completion rate</p>
              <p className="font-display font-bold text-2xl text-ink mt-1">
                {avgCompletion.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Per-course breakdown */}
          <div className="border border-line rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-ink">Course</th>
                  <th className="px-4 py-3 font-semibold text-ink">Status</th>
                  <th className="px-4 py-3 font-semibold text-ink text-right">Enrollments</th>
                  <th className="px-4 py-3 font-semibold text-ink text-right">Revenue</th>
                  <th className="px-4 py-3 font-semibold text-ink text-right">Completion</th>
                  <th className="px-4 py-3 font-semibold text-ink text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.course_id}>
                    <td className="px-4 py-3 text-ink font-medium">{r.title}</td>
                    <td className="px-4 py-3 text-slate">{r.is_published ? 'Published' : 'Draft'}</td>
                    <td className="px-4 py-3 text-right text-slate">{r.enrollment_count}</td>
                    <td className="px-4 py-3 text-right text-slate">${r.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate">{r.completion_rate}%</td>
                    <td className="px-4 py-3 text-right text-slate">
                      {r.average_rating != null ? `★ ${r.average_rating} (${r.review_count})` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}