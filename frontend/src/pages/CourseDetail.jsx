import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { courseService, sectionService, enrollmentService, paymentService, reviewService } from '../services/resources'
import { useAuth } from '../context/AuthContext'
import AIQAPanel from '../components/AIQAPanel'
import StarRatingInput from '../components/StarRatingInput'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [reviews, setReviews] = useState([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    courseService.get(courseId).then((res) => setCourse(res.data))
    sectionService.listForCourse(courseId).then((res) => setSections(res.data))
    reviewService.listForCourse(courseId).then((res) => setReviews(res.data))

    if (user) {
      enrollmentService.myEnrollments().then((res) => {
        setEnrolled(res.data.some((e) => e.course_id === Number(courseId)))
      })
    }
  }, [courseId, user])

  async function handleEnroll() {
    if (!user) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    try {
      if (course.price > 0) {
        const res = await paymentService.createCheckoutSession(course.id)
        window.location.href = res.data.checkout_url
      } else {
        await enrollmentService.enroll(course.id)
        setEnrolled(true)
      }
    } catch (err) {
      // If we're already enrolled (e.g. stale UI state), just reflect that
      // instead of leaving the user stuck on a failed "Enroll" click.
      if (err.response?.status === 400) {
        setEnrolled(true)
      }
    } finally {
      setEnrolling(false)
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    setReviewError('')
    if (reviewRating < 1) {
      setReviewError('Please select a star rating.')
      return
    }
    setSubmittingReview(true)
    try {
      await reviewService.create({ course_id: course.id, rating: reviewRating, comment: reviewComment })
      const res = await reviewService.listForCourse(courseId)
      setReviews(res.data)
      setReviewRating(0)
      setReviewComment('')
    } catch (err) {
      setReviewError(err.response?.data?.detail || 'Failed to submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (!course) return <p className="text-center py-24 text-slate">Loading course…</p>

  const totalLectures = sections.reduce((acc, s) => acc + s.lectures.length, 0)
  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div>
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {course.category && (
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">
              {course.category}
            </span>
          )}
          <h1 className="font-display font-bold text-3xl md:text-4xl mt-2">{course.title}</h1>
          {course.subtitle && <p className="text-paper/70 mt-3 text-lg">{course.subtitle}</p>}

          <div className="flex items-center gap-4 mt-4 text-sm text-paper/60">
            {avgRating && <span>⭐ {avgRating} ({reviews.length} reviews)</span>}
            <span>{totalLectures} lectures</span>
            {course.level && <span className="capitalize">{course.level}</span>}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="font-display font-semibold text-xl text-ink mb-3">About this course</h2>
            <p className="text-slate leading-relaxed whitespace-pre-line">{course.description}</p>
          </div>

          <div>
            <h2 className="font-display font-semibold text-xl text-ink mb-4">Course content</h2>
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="border border-line rounded-xl overflow-hidden">
                  <div className="bg-ink/5 px-4 py-3 font-medium text-ink">{section.title}</div>
                  <div className="divide-y divide-line">
                    {section.lectures.map((lecture) => (
                      <div key={lecture.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate">{lecture.title}</span>
                        <span className="text-slate/60">
                          {Math.round(lecture.duration_seconds / 60)} min
                        </span>
                      </div>
                    ))}
                    {section.lectures.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate/50">No lectures yet.</p>
                    )}
                  </div>
                </div>
              ))}
              {sections.length === 0 && <p className="text-slate">Content coming soon.</p>}
            </div>
          </div>

          {user?.role === 'student' && enrolled && !reviews.some((r) => r.student_id === user.id) && (
            <div>
              <h2 className="font-display font-semibold text-xl text-ink mb-4">Leave a review</h2>
              <form onSubmit={handleSubmitReview} className="border border-line rounded-xl p-5 space-y-3">
                <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your thoughts on this course (optional)"
                  rows={3}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
                {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            </div>
          )}

          {reviews.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-xl text-ink mb-4">Student reviews</h2>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border border-line rounded-xl p-4">
                    <span className="text-accent">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {r.comment && <p className="text-sm text-slate mt-2">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line rounded-2xl p-6">
            <p className="font-display font-bold text-3xl text-ink">
              {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
            </p>

            {user?.role === 'instructor' ? (
              course.instructor_id === user.id ? (
                <button
                  onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
                  className="w-full mt-4 bg-ink text-paper rounded-lg py-3 font-semibold hover:bg-ink/90 transition-colors"
                >
                  Manage course
                </button>
              ) : (
                <p className="mt-4 text-sm text-slate/60 text-center">
                  Enrollment is for student accounts. Log in as a student to take this course.
                </p>
              )
            ) : enrolled ? (
              <button
                onClick={() => navigate(`/learn/${course.id}`)}
                className="w-full mt-4 bg-success text-paper rounded-lg py-3 font-semibold hover:opacity-90 transition-opacity"
              >
                Go to course
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full mt-4 bg-accent text-paper rounded-lg py-3 font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {enrolling ? 'Processing…' : course.price > 0 ? 'Buy course' : 'Enroll for free'}
              </button>
            )}
          </div>

          <AIQAPanel courseId={course.id} />
        </div>
      </div>
    </div>
  )
}