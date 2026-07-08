import { Link } from 'react-router-dom'

export default function PaymentSuccess() {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-24">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="font-display font-bold text-2xl text-ink mb-2">You're enrolled!</h1>
      <p className="text-slate mb-8">
        Your payment went through. Head to your dashboard to start learning.
      </p>
      <Link
        to="/my-learning"
        className="bg-accent text-paper rounded-lg px-6 py-3 font-semibold hover:bg-accent/90 transition-colors inline-block"
      >
        Go to my learning
      </Link>
    </div>
  )
}
