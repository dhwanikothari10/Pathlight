import { useState } from 'react'

/**
 * Clickable 1-5 star rating input. Controlled component: `value` is the
 * current rating (0 = none selected), `onChange` fires with the new rating
 * when a star is clicked.
 */
export default function StarRatingInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-colors"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <span className={(hovered || value) >= star ? 'text-accent' : 'text-ink/20'}>★</span>
        </button>
      ))}
    </div>
  )
}