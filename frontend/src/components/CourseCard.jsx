import { Link } from 'react-router-dom'

export default function CourseCard({ course }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group block rounded-2xl border border-line bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-video bg-ink/5 overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-3xl text-ink/20">
            {course.title?.charAt(0) || '?'}
          </div>
        )}
      </div>

      <div className="p-5">
        {course.category && (
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            {course.category}
          </span>
        )}
        <h3 className="font-display font-semibold text-lg text-ink mt-1 leading-snug line-clamp-2">
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="text-sm text-slate mt-1 line-clamp-2">{course.subtitle}</p>
        )}

        {course.average_rating != null && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <span className="text-accent">★ {course.average_rating}</span>
            <span className="text-slate/60">({course.review_count})</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          {course.level && (
            <span className="text-xs px-2 py-1 rounded-full bg-ink/5 text-slate capitalize">
              {course.level}
            </span>
          )}
          <span className="font-display font-bold text-ink">
            {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
          </span>
        </div>
      </div>
    </Link>
  )
}