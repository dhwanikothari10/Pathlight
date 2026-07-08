import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  courseService,
  sectionService,
  enrollmentService,
  aiService,
} from '../services/resources'
import AIQAPanel from '../components/AIQAPanel'

/**
 * YouTube watch URLs (youtube.com/watch?v=... or youtu.be/...) can't be
 * played via a plain <video> tag -- they need YouTube's embed iframe format.
 * Returns the embed URL if this is a YouTube link, otherwise null.
 */
function getYoutubeEmbedUrl(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

export default function LearnCourse() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [activeLecture, setActiveLecture] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [completedIds, setCompletedIds] = useState(new Set())
  const [quiz, setQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})

  useEffect(() => {
    courseService.get(courseId).then((res) => setCourse(res.data))
    sectionService.listForCourse(courseId).then((res) => {
      setSections(res.data)
      const firstLecture = res.data[0]?.lectures?.[0]
      if (firstLecture) setActiveLecture(firstLecture)
    })
    enrollmentService.myEnrollments().then((res) => {
      const e = res.data.find((en) => en.course_id === Number(courseId))
      setEnrollment(e || null)
      if (e) setCompletedIds(new Set(e.completed_lecture_ids))
    })
  }, [courseId])

  useEffect(() => {
    setQuiz(null)
    setQuizAnswers({})
    if (activeLecture) {
      aiService.getQuiz(activeLecture.id).then((res) => {
        if (res.data.length > 0) setQuiz(res.data)
      })
    }
  }, [activeLecture])

  async function toggleComplete() {
    if (!enrollment || !activeLecture) return
    const res = await enrollmentService.completeLecture(enrollment.id, activeLecture.id)
    setEnrollment(res.data)
    setCompletedIds(new Set(res.data.completed_lecture_ids))
  }

  if (!course || !activeLecture) {
    return <p className="text-center py-24 text-slate">Loading course content…</p>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[260px_1fr_320px] gap-6 items-start">
      {/* Lecture list sidebar */}
      <aside className="space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <h2 className="font-display font-semibold text-ink text-sm uppercase tracking-wide">
          {course.title}
        </h2>
        {sections.map((section) => (
          <div key={section.id}>
            <p className="text-xs font-semibold text-slate/70 mt-3 mb-1">{section.title}</p>
            {section.lectures.map((lecture) => (
              <button
                key={lecture.id}
                onClick={() => setActiveLecture(lecture)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  activeLecture.id === lecture.id ? 'bg-accent/10 text-accent font-medium' : 'text-slate hover:bg-ink/5'
                }`}
              >
                {completedIds.has(lecture.id) ? '✓ ' : ''}
                {lecture.title}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content: video + quiz */}
      <main className="space-y-6">
        <div className="aspect-video bg-ink rounded-xl overflow-hidden">
          {(() => {
            const youtubeEmbedUrl = getYoutubeEmbedUrl(activeLecture.video_url)
            if (youtubeEmbedUrl) {
              return (
                <iframe
                  key={activeLecture.id}
                  className="w-full h-full"
                  src={youtubeEmbedUrl}
                  title={activeLecture.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            }
            if (activeLecture.video_url) {
              return (
                <video key={activeLecture.id} controls className="w-full h-full" src={activeLecture.video_url} />
              )
            }
            return (
              <div className="w-full h-full flex items-center justify-center text-paper/40">
                No video for this lecture yet
              </div>
            )
          })()}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="font-display font-semibold text-xl text-ink">{activeLecture.title}</h1>
          {enrollment && (
            <button
              onClick={toggleComplete}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                completedIds.has(activeLecture.id)
                  ? 'bg-success text-paper hover:opacity-90'
                  : 'bg-success/10 text-success hover:bg-success/20'
              }`}
              title={completedIds.has(activeLecture.id) ? 'Click to mark as not complete' : 'Click to mark complete'}
            >
              {completedIds.has(activeLecture.id) ? '✓ Completed' : 'Mark complete'}
            </button>
          )}
        </div>

        {/* Quiz section (Phase 2 AI feature) -- students view quizzes the
            instructor has already generated; generation itself happens on
            the Manage Course page (instructor-only) */}
        <div className="border border-line rounded-xl p-5">
          <h3 className="font-display font-semibold text-ink mb-3">Knowledge check</h3>

          {quiz ? (
            <div className="space-y-5">
              {quiz.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-ink mb-2">{q.question_text}</p>
                  <div className="space-y-1.5">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const optionText = q[`option_${opt.toLowerCase()}`]
                      const selected = quizAnswers[q.id] === opt
                      const isCorrect = q.correct_option === opt
                      const showResult = quizAnswers[q.id]
                      return (
                        <button
                          key={opt}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                            showResult && isCorrect
                              ? 'border-success bg-success/10 text-success'
                              : showResult && selected
                              ? 'border-red-400 bg-red-50 text-red-600'
                              : 'border-line text-slate hover:border-ink/30'
                          }`}
                        >
                          {opt}. {optionText}
                        </button>
                      )
                    })}
                  </div>
                  {quizAnswers[q.id] && q.explanation && (
                    <p className="text-xs text-slate/70 mt-2">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate/60">
              No quiz yet for this lecture — instructors can generate one from the lecture transcript.
            </p>
          )}
        </div>
      </main>

      {/* AI Q&A panel -- sticky so it stays put while the main content scrolls */}
      <div className="lg:sticky lg:top-24">
        <AIQAPanel courseId={course.id} />
      </div>
    </div>
  )
}