import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { courseService, aiService } from '../services/resources'
import CourseCard from '../components/CourseCard'

export default function Home() {
  const [courses, setCourses] = useState([])
  const [nlQuery, setNlQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    courseService.list().then((res) => setCourses(res.data.slice(0, 6))).catch(() => {})
  }, [])

  function handleNlSearch(e) {
    e.preventDefault()
    if (!nlQuery.trim()) return
    navigate(`/courses?nl=${encodeURIComponent(nlQuery)}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight">
              Every course comes with its own AI tutor.
            </h1>
            <p className="mt-5 text-paper/70 text-lg leading-relaxed max-w-md">
              Ask questions, get instant quizzes, and find the right course just by describing
              what you want to learn — in plain language.
            </p>

            <form onSubmit={handleNlSearch} className="mt-8 flex gap-2 max-w-md">
              <input
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder='Try: "beginner web scraping under $50"'
                className="flex-1 rounded-lg px-4 py-3 text-ink text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="bg-accent text-paper rounded-lg px-5 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-paper/5 border border-paper/10 p-6">
            <p className="text-xs uppercase tracking-wide text-paper/50 font-semibold mb-3">
              Course AI Tutor — live preview
            </p>
            <div className="space-y-3">
              <div className="bg-paper/10 rounded-xl px-4 py-3 text-sm max-w-[85%]">
                What's the difference between a list and a tuple?
              </div>
              <div className="bg-accent/90 rounded-xl px-4 py-3 text-sm max-w-[90%] ml-auto">
                Lists are mutable — you can change them after creating them. Tuples are
                immutable, which makes them faster and safer for fixed collections of data.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display font-bold text-2xl text-ink">Featured courses</h2>
          <Link to="/courses" className="text-accent font-medium text-sm hover:underline">
            Browse all →
          </Link>
        </div>

        {courses.length === 0 ? (
          <p className="text-slate">No courses published yet — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
