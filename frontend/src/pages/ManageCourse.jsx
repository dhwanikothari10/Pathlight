import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { courseService, sectionService, lectureService, aiService } from '../services/resources'

export default function ManageCourse() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [showEditCourse, setShowEditCourse] = useState(false)

  useEffect(() => {
    load()
  }, [courseId])

  // While any lecture is still transcribing in the background, poll every
  // 10s so the "Transcribing..." badge updates to "Transcript ready"
  // without the instructor needing to manually refresh the page.
  useEffect(() => {
    const hasPending = sections.some((s) => s.lectures.some((l) => l.transcript_status === 'pending'))
    if (!hasPending) return

    const interval = setInterval(() => {
      sectionService.listForCourse(courseId).then((res) => setSections(res.data))
    }, 10000)

    return () => clearInterval(interval)
  }, [sections, courseId])

  function load() {
    courseService.get(courseId).then((res) => setCourse(res.data))
    sectionService.listForCourse(courseId).then((res) => setSections(res.data))
  }

  async function handleAddSection(e) {
    e.preventDefault()
    if (!newSectionTitle.trim()) return
    await sectionService.create(courseId, { title: newSectionTitle, order_index: sections.length })
    setNewSectionTitle('')
    load()
  }

  async function handleTogglePublish() {
    setPublishing(true)
    try {
      const res = await courseService.update(courseId, { is_published: course.is_published ? 0 : 1 })
      setCourse(res.data)
    } finally {
      setPublishing(false)
    }
  }

  if (!course) return <p className="text-center py-24 text-slate">Loading…</p>

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">{course.title}</h1>
          <p className="text-sm text-slate mt-1">
            {course.is_published ? 'Published — visible to students' : 'Draft — only visible to you'}
            {' · '}
            ${Number(course.price).toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditCourse((prev) => !prev)}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold border border-line text-ink hover:border-ink/30"
          >
            {showEditCourse ? 'Close edit' : 'Edit course'}
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
              course.is_published ? 'bg-ink/10 text-ink' : 'bg-success text-paper hover:opacity-90'
            }`}
          >
            {course.is_published ? 'Unpublish' : 'Publish course'}
          </button>
        </div>
      </div>

      {showEditCourse && (
        <EditCourseForm
          course={course}
          onSaved={(updated) => {
            setCourse(updated)
            setShowEditCourse(false)
          }}
          onCancel={() => setShowEditCourse(false)}
        />
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <SectionEditor key={section.id} section={section} onChange={load} />
        ))}

        <form onSubmit={handleAddSection} className="flex gap-2">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="New section title (e.g. Module 1: Basics)"
            className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button className="px-4 py-2.5 rounded-lg border border-line text-sm font-medium hover:border-ink/30">
            Add section
          </button>
        </form>
      </div>
    </div>
  )
}

function EditCourseForm({ course, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: course.title || '',
    description: course.description || '',
    price: course.price ?? 0,
    thumbnail_url: course.thumbnail_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError('Title cannot be empty.')
      return
    }
    const priceNum = Number(form.price)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a number ≥ 0.')
      return
    }

    setSaving(true)
    try {
      const res = await courseService.update(course.id, {
        title: form.title.trim(),
        description: form.description,
        price: priceNum,
        thumbnail_url: form.thumbnail_url.trim(),
      })
      onSaved(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 space-y-4 bg-ink/5 rounded-xl p-5">
      <div>
        <label className="block text-xs font-semibold text-slate mb-1">Title</label>
        <input
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate mb-1">Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate mb-1">Price (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-slate mt-1">
            Set to 0 for a free course. If not free, use $0.50 or more — Stripe rejects anything between $0.01–$0.49.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate mb-1">Thumbnail URL</label>
          <input
            value={form.thumbnail_url}
            onChange={(e) => update('thumbnail_url', e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {form.thumbnail_url && (
        <img
          src={form.thumbnail_url}
          alt="Thumbnail preview"
          className="h-32 rounded-lg border border-line object-cover"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function SectionEditor({ section, onChange }) {
  const [showAddLecture, setShowAddLecture] = useState(false)
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'file'
  const [form, setForm] = useState({ title: '', video_url: '', transcript: '' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddLecture(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (uploadMode === 'url') {
        await lectureService.addViaUrl(section.id, {
          title: form.title,
          video_url: form.video_url,
          order_index: section.lectures.length,
          transcript: form.transcript,
        })
      } else {
        const fd = new FormData()
        fd.append('title', form.title)
        fd.append('order_index', section.lectures.length)
        fd.append('transcript', form.transcript)
        fd.append('video_file', file)
        await lectureService.addViaUpload(section.id, fd)
      }
      setForm({ title: '', video_url: '', transcript: '' })
      setFile(null)
      setShowAddLecture(false)
      onChange()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSection() {
    await sectionService.remove(section.id)
    onChange()
  }

  return (
    <div className="border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-ink">{section.title}</h3>
        <button onClick={handleDeleteSection} className="text-red-500 text-xs font-medium hover:underline">
          Remove section
        </button>
      </div>

      <div className="space-y-2">
        {section.lectures.map((lecture) => (
          <LectureRow key={lecture.id} lecture={lecture} onChange={onChange} />
        ))}
      </div>

      {showAddLecture ? (
        <form onSubmit={handleAddLecture} className="mt-4 space-y-3 bg-ink/5 rounded-lg p-4">
          <input
            required
            placeholder="Lecture title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`px-3 py-1.5 rounded-lg ${uploadMode === 'url' ? 'bg-accent text-paper' : 'bg-white border border-line text-slate'}`}
            >
              Paste video URL
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1.5 rounded-lg ${uploadMode === 'file' ? 'bg-accent text-paper' : 'bg-white border border-line text-slate'}`}
            >
              Upload video file
            </button>
          </div>

          {uploadMode === 'url' ? (
            <input
              required
              placeholder="https://youtube.com/... or any direct video link"
              value={form.video_url}
              onChange={(e) => update('video_url', e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          ) : (
            <input
              required
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm"
            />
          )}

          <textarea
            placeholder="Transcript / notes (powers the AI Q&A and quiz generator for this lecture)"
            rows={4}
            value={form.transcript}
            onChange={(e) => update('transcript', e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save lecture'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddLecture(false)}
              className="px-4 py-2 text-sm text-slate"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddLecture(true)}
          className="mt-3 text-sm text-accent font-medium hover:underline"
        >
          + Add lecture
        </button>
      )}
    </div>
  )
}

function LectureRow({ lecture, onChange }) {
  const [generating, setGenerating] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState(null) // null = not loaded yet, [] = loaded, no quiz

  useEffect(() => {
    aiService.getQuiz(lecture.id).then((res) => setQuizQuestions(res.data))
  }, [lecture.id])

  async function handleGenerateQuiz() {
    setGenerating(true)
    try {
      const res = await aiService.generateQuiz(lecture.id)
      setQuizQuestions(res.data)
    } finally {
      setGenerating(false)
    }
  }

  const hasQuiz = quizQuestions && quizQuestions.length > 0

  return (
    <div className="px-3 py-2 rounded-lg hover:bg-ink/5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate">{lecture.title}</span>
          {lecture.transcript_status === 'pending' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              Transcribing…
            </span>
          )}
          {lecture.transcript_status === 'completed' && (
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success hover:bg-success/20"
            >
              {showTranscript ? 'Hide transcript' : 'View transcript'}
            </button>
          )}
          {lecture.transcript_status === 'failed' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              Transcription failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasQuiz ? (
            <button
              onClick={() => setShowQuiz((prev) => !prev)}
              className="text-success text-xs font-medium hover:underline"
            >
              {showQuiz ? 'Hide quiz' : `View quiz (${quizQuestions.length})`}
            </button>
          ) : (
            <button
              onClick={handleGenerateQuiz}
              disabled={generating || quizQuestions === null}
              className="text-accent text-xs font-medium disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate quiz'}
            </button>
          )}
        </div>
      </div>

      {showTranscript && (
        <div className="mt-2 text-sm text-slate bg-white border border-line rounded-lg p-3 whitespace-pre-line max-h-48 overflow-y-auto">
          {lecture.transcript || 'No transcript text available.'}
        </div>
      )}

      {showQuiz && hasQuiz && (
        <div className="mt-2 space-y-3 bg-white border border-line rounded-lg p-3 max-h-64 overflow-y-auto">
          {quizQuestions.map((q, i) => (
            <div key={q.id} className="text-sm">
              <p className="font-medium text-ink">{i + 1}. {q.question_text}</p>
              <ul className="mt-1 space-y-0.5 text-slate">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <li
                    key={opt}
                    className={q.correct_option === opt ? 'text-success font-medium' : ''}
                  >
                    {opt}. {q[`option_${opt.toLowerCase()}`]}
                    {q.correct_option === opt && ' ✓'}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}