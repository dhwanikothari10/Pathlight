import { useState, useRef, useEffect } from 'react'
import { aiService } from '../services/resources'

export default function AIQAPanel({ courseId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Ask me anything about this course — I'll answer using the actual lecture content.",
      sources: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await aiService.askQuestion(courseId, question)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.data.answer, sources: res.data.source_lectures },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Something went wrong answering that — please try again.', sources: [] },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-ink text-paper flex flex-col h-[480px] overflow-hidden">
      <div className="px-5 py-4 border-b border-paper/10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <h3 className="font-display font-semibold text-sm">Course AI Tutor</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-accent text-paper' : 'bg-paper/10 text-paper/95'
              }`}
            >
              <p>{m.text}</p>
              {m.sources?.length > 0 && (
                <p className="mt-2 text-xs text-paper/50">
                  From: {m.sources.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-paper/10 rounded-xl px-4 py-2.5 text-sm text-paper/60">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-paper/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this course…"
          className="flex-1 bg-paper/10 rounded-lg px-3 py-2 text-sm text-paper placeholder:text-paper/40 outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  )
}
