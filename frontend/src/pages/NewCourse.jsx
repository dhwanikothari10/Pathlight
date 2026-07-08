import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { courseService } from '../services/resources'

export default function NewCourse() {
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    level: 'beginner',
    price: 0,
    thumbnail_url: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await courseService.create({ ...form, price: Number(form.price) })
      navigate(`/instructor/courses/${res.data.id}/manage`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create course.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl text-ink mb-8">Create a new course</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-ink">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Subtitle</label>
          <input
            value={form.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink">Category</label>
            <input
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="Web Development"
              className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Level</label>
            <select
              value={form.level}
              onChange={(e) => update('level', e.target.value)}
              className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink">Price (USD, 0 for free)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Thumbnail URL</label>
            <input
              value={form.thumbnail_url}
              onChange={(e) => update('thumbnail_url', e.target.value)}
              className="w-full mt-1 rounded-lg border border-line px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper rounded-lg px-6 py-3 font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create course'}
        </button>
      </form>
    </div>
  )
}
