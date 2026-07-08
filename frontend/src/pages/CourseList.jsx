import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courseService, aiService } from '../services/resources'
import CourseCard from '../components/CourseCard'

export default function CourseList() {
  const [searchParams] = useSearchParams()
  const nlParam = searchParams.get('nl')

  const [courses, setCourses] = useState([])
  const [query, setQuery] = useState(nlParam || '')
  const [interpretedFilters, setInterpretedFilters] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(nlParam ? 'ai' : 'keyword')

  useEffect(() => {
    if (nlParam) {
      runNlSearch(nlParam)
    } else {
      loadCourses()
    }
  }, [])

  function loadCourses(kw = '') {
    setLoading(true)
    setMode('keyword')
    setInterpretedFilters(null)
    courseService
      .list(kw ? { keyword: kw } : {})
      .then((res) => setCourses(res.data))
      .finally(() => setLoading(false))
  }

  async function runNlSearch(q) {
    setLoading(true)
    setMode('ai')
    try {
      const res = await aiService.nlSearch(q)
      setInterpretedFilters(res.data.interpreted_filters)
      setCourses(res.data.results)
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl text-ink mb-6">Browse courses</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          loadCourses(query)
        }}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search by title, or describe it: "advanced React under $30"'
          className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg border border-line text-sm font-medium hover:border-ink/30"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => runNlSearch(query)}
          className="px-4 py-2.5 rounded-lg bg-accent text-paper text-sm font-medium hover:bg-accent/90"
        >
          Ask AI
        </button>
      </form>

      {mode === 'ai' && interpretedFilters && (
        <div className="mb-8 text-sm text-slate bg-ink/5 rounded-lg px-4 py-3">
          Interpreted as:{' '}
          {Object.entries(interpretedFilters)
            .filter(([, v]) => v !== null && v !== '')
            .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
            .join(' · ') || 'no specific filters'}
        </div>
      )}

      {loading ? (
        <p className="text-slate">Loading courses…</p>
      ) : courses.length === 0 ? (
        <p className="text-slate">No courses matched. Try a different search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}