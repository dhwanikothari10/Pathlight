import { Link } from 'react-router-dom'

export default function PaymentCancelled() {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-24">
      <h1 className="font-display font-bold text-2xl text-ink mb-2">Payment cancelled</h1>
      <p className="text-slate mb-8">No charge was made. You can try again anytime.</p>
      <Link
        to="/courses"
        className="bg-ink text-paper rounded-lg px-6 py-3 font-semibold hover:bg-ink/90 transition-colors inline-block"
      >
        Browse courses
      </Link>
    </div>
  )
}
